import axios from 'axios';

async function fetchExternalAPI() {
    const locCode = 'G-Edappally'; // Example locCode from swagger
    const dateFrom = '2024-01-01';
    const dateTo = '2026-12-31';

    try {
        const url = `https://rentalapi.rootments.live/api/GetBooking/GetBookingList?LocCode=${locCode}&DateFrom=${dateFrom}&DateTo=${dateTo}`;
        console.log('Fetching', url);
        const response = await axios.get(url);
        let list = response.data.dataSet ? response.data.dataSet.data : (response.data.data ? response.data.data : response.data);
        console.log('Sample Booking Item keys:', list && list.length > 0 ? Object.keys(list[0]) : 'No data');
        if (list && list.length > 0) console.log(list[0]);
    } catch (e) {
        console.error('Error fetching booking:', e.message);
    }
}
fetchExternalAPI();
