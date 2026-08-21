import 'dotenv/config';

async function run() {
  for (const locId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const res = await fetch('https://rentalapi.rootments.live/api/Reports/GetPerformanceStaffReportWithCancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        LocationID: locId,
        FromDate: '2026-08-01',
        ToDate: '2026-08-19'
      })
    });
    const data = await res.json();
    const items = data?.dataSet?.data || [];
    const rameeshItems = items.filter(x => /ramee/i.test(x.bookingBy));
    if (rameeshItems.length > 0) {
      console.log(`Loc ID: ${locId} has ${rameeshItems.length} items for Rameesh:`, rameeshItems.slice(0, 3));
    }
  }
}

run();
