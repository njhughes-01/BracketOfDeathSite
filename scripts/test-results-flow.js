/**
 * Simple debug to test the parsing logic.
 */
const API_URL = process.env.API_URL || 'http://localhost:5173';

async function test() {
    const res = await fetch(`${API_URL}/api/tournament-results/tournament/694d8495dc59ab005095cb3f`);
    const raw = await res.json();

    // useApi simulation
    const wrapper = raw.success ? raw.data : null;

    console.log('API success:', raw.success);
    console.log('wrapper keys:', wrapper ? Object.keys(wrapper) : 'null');
    console.log('"results" in wrapper:', wrapper && "results" in wrapper);
    console.log('results is array:', wrapper && Array.isArray(wrapper.results));
    console.log('results count:', wrapper?.results?.length || 0);
}

test().catch(e => console.log('Error:', e.message));
