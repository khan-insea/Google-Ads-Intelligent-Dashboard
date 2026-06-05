import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DB_FILE = path.join(process.cwd(), 'data', 'db_store.json');

function getLocalData() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

function saveLocalData(data: any) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Unable to write local DB:', err);
  }
}

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const report: {
    supabase: { normalizedCount: number; mergedIdentifiers: string[]; remainingUnique: any[] } | null;
    localDb: { normalizedCount: number; mergedIdentifiers: string[]; remainingUnique: any[] };
    success: boolean;
  } = {
    supabase: null,
    localDb: { normalizedCount: 0, mergedIdentifiers: [], remainingUnique: [] },
    success: true,
  };

  // 1. Process Supabase Database Cleanup
  if (supabaseUrl && serviceKey) {
    try {
      const headers = {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      };

      // Get all accounts
      const accountsRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/google_ads_accounts?select=*`, { headers });
      if (accountsRes.ok) {
        const rawAccounts = await accountsRes.json();
        
        // Group by normalized customer_id
        const groups: Record<string, any[]> = {};
        for (const acc of rawAccounts) {
          const cleanCID = (acc.customer_id || '').replace(/\D/g, "");
          if (!cleanCID) continue;
          if (!groups[cleanCID]) {
            groups[cleanCID] = [];
          }
          groups[cleanCID].push(acc);
        }

        const mergedIds: string[] = [];
        const uniqueAccountsToSave: any[] = [];
        let normalizedCount = 0;

        for (const [cleanCID, list] of Object.entries(groups)) {
          // Select primary: preference to name not containing "Live Connected" or first created
          let primary = list.find(a => !String(a.account_name || '').includes('Live Connected'));
          if (!primary) {
            primary = list[0];
          }

          // Clean customer identifiers
          const oldCID = primary.customer_id;
          const oldLCID = primary.login_customer_id;
          primary.customer_id = cleanCID;
          primary.login_customer_id = oldLCID ? oldLCID.replace(/\D/g, "") : null;

          if (oldCID !== primary.customer_id || oldLCID !== primary.login_customer_id) {
            normalizedCount++;
          }

          uniqueAccountsToSave.push(primary);

          // All other items are duplicates
          const duplicates = list.filter(a => a.id !== primary.id);
          for (const dup of duplicates) {
            mergedIds.push(dup.id);

            // Re-map references in other tables
            const tablesToMigrate = [
              'campaign_daily_metrics',
              'ad_group_daily_metrics',
              'keyword_daily_metrics',
              'search_term_daily_metrics',
              'monthly_reports',
              'sync_logs',
              'recommendations'
            ];

            for (const tbl of tablesToMigrate) {
              const patchUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${tbl}?google_ads_account_id=eq.${encodeURIComponent(dup.id)}`;
              await fetch(patchUrl, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ google_ads_account_id: primary.id })
              });
            }

            // Delete duplicate account record
            const deleteUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/google_ads_accounts?id=eq.${encodeURIComponent(dup.id)}`;
            await fetch(deleteUrl, { headers, method: 'DELETE' });
          }
        }

        // Save & normalize unique accounts
        for (const acc of uniqueAccountsToSave) {
          const accUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/google_ads_accounts?id=eq.${encodeURIComponent(acc.id)}`;
          await fetch(accUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              customer_id: acc.customer_id,
              login_customer_id: acc.login_customer_id,
              status: acc.status || 'connected'
            })
          });
        }

        report.supabase = {
          normalizedCount,
          mergedIdentifiers: mergedIds,
          remainingUnique: uniqueAccountsToSave.map(a => ({
            id: a.id,
            accountName: a.account_name,
            customerId: a.customer_id,
            loginCustomerId: a.login_customer_id,
            status: a.status
          }))
        };
      }
    } catch (eSupabase) {
      console.error('Supabase cleanup error:', eSupabase);
    }
  }

  // 2. Process Local JSON file Cleanup
  if (process.env.NODE_ENV !== 'production') {
    try {
      const localData = getLocalData();
      if (localData.google_ads_accounts && Array.isArray(localData.google_ads_accounts)) {
        const groups: Record<string, any[]> = {};
        for (const acc of localData.google_ads_accounts) {
          const cleanCID = (acc.customerId || '').replace(/\D/g, "");
          if (!cleanCID) continue;
          if (!groups[cleanCID]) {
            groups[cleanCID] = [];
          }
          groups[cleanCID].push(acc);
        }

        const mergedIndices: string[] = [];
        const finalAccounts: any[] = [];
        let normalizedCount = 0;

        for (const [cleanCID, list] of Object.entries(groups)) {
          let primary = list.find(a => !String(a.accountName || '').includes('Live Connected'));
          if (!primary) {
            primary = list[0];
          }

          const oldCID = primary.customerId;
          const oldLCID = primary.loginCustomerId;
          primary.customerId = cleanCID;
          primary.loginCustomerId = oldLCID ? oldLCID.replace(/\D/g, "") : "";

          if (oldCID !== primary.customerId || oldLCID !== primary.loginCustomerId) {
            normalizedCount++;
          }

          finalAccounts.push(primary);

          const duplicates = list.filter(a => a.id !== primary.id);
          for (const dup of duplicates) {
            mergedIndices.push(dup.id);

            // Update metrics in local JSON db
            const metricsKeys = [
              'campaign_daily_metrics',
              'ad_group_daily_metrics',
              'keyword_daily_metrics',
              'search_term_daily_metrics',
              'monthly_reports',
              'sync_logs',
              'recommendations'
            ];

            for (const key of metricsKeys) {
              if (localData[key] && Array.isArray(localData[key])) {
                localData[key].forEach((row: any) => {
                  if (row.googleAdsAccountId === dup.id) {
                    row.googleAdsAccountId = primary.id;
                  }
                });
              }
            }
          }
        }

        localData.google_ads_accounts = finalAccounts;
        saveLocalData(localData);

        report.localDb = {
          normalizedCount,
          mergedIdentifiers: mergedIndices,
          remainingUnique: finalAccounts.map(a => ({
            id: a.id,
            accountName: a.accountName,
            customerId: a.customerId,
            loginCustomerId: a.loginCustomerId,
            status: a.status
          }))
        };
      }
    } catch (eLocal) {
      console.error('Local JSON file clean-up error:', eLocal);
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Cleanup và De-duplication hoàn tất thành công trên cơ sở dữ liệu!',
    data: report
  });
}
