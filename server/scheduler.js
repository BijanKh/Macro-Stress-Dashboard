import cron from 'node-cron';

export function startScheduler(fetchAndStoreFn) {
  cron.schedule('*/30 8-18 * * 1-5', async () => {
    console.log(`[${new Date().toISOString()}] Scheduled fetch starting...`);
    try {
      await fetchAndStoreFn();
      console.log(`[${new Date().toISOString()}] Scheduled fetch complete.`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Scheduled fetch failed:`, err.message);
    }
  }, {
    timezone: 'America/New_York'
  });

  console.log('Scheduler started: fetching every 30min, Mon-Fri, 8am-6pm ET');
}
