
const BASE_URL = process.env.API_URL || 'http://localhost:5173/api';
const TOKEN = process.argv[2];

async function test() {
    if (!TOKEN) { console.error("No token"); process.exit(1); }
    console.log(`Testing POST ${BASE_URL}/tournaments/setup`);

    // Create minimal payload
    const payload = {
        basicInfo: {
            date: new Date().toISOString(),
            bodNumber: Math.floor(200000 + Math.random() * 900000), // Random 6 digit
            format: 'Mixed',
            location: 'Test Loc',
            advancementCriteria: 'Winners advance'
        },
        maxPlayers: 16
    };

    try {
        const res = await fetch(`${BASE_URL}/tournaments/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Status:', res.status);
        console.log('Headers:', [...res.headers.entries()]);
        const text = await res.text();
        console.log('Body:', text.substring(0, 1000));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
test();
