
const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJkOHNJbGI4Zk9nWUFud2FPYXR4U25TVktNY3dVSkw3YjFyVVdyRU5sR084In0.eyJleHAiOjE3NjU5MDM5NzQsImlhdCI6MTc2NTkwMzY3NCwianRpIjoiOGY2MThhY2ItNGFjZC00MjIxLTk0MGItNTIwNzRmYTM1OGIxIiwiaXNzIjoiaHR0cDovL2tleWNsb2FrOjgwODAvcmVhbG1zL2JyYWNrZXRvZmRlYXRoc2l0ZSIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJmMjUwYWU3ZC00MmVlLTQ5MmMtOWYzNS02ODJkMTNhY2RiMDEiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJib2QtYXBwIiwic2Vzc2lvbl9zdGF0ZSI6IjM3Y2M1NGMzLTMwYjMtNGM1OS05NjZiLWI3Y2UzNDQ4YTBlZSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJodHRwczovL2JvZC5saWdodG1lZGlhLmNsdWIiLCJodHRwOi8vZnJvbnRlbmQ6NTE3MyIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1icmFja2V0b2ZkZWF0aHNpdGUiLCJvZmZsaW5lX2FjY2VzcyIsImFkbWluIiwidW1hX2F1dGhvcml6YXRpb24iLCJ1c2VyIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJlbWFpbCBwcm9maWxlIiwic2lkIjoiMzdjYzU0YzMtMzBiMy00YzU5LTk2NmItYjdjZTM0NDhhMGVlIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJUb3VybmFtZW50IEFkbWluaXN0cmF0b3IiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhZG1pbiIsImdpdmVuX25hbWUiOiJUb3VybmFtZW50IiwiZmFtaWx5X25hbWUiOiJBZG1pbmlzdHJhdG9yIiwiZW1haWwiOiJhZG1pbkBicmFja2V0b2ZkZWF0aHNpdGUuY29tIn0.O58DtF3LzBLeisEfN-oNkyHXJxf-1tCsOy2lTTnDPyTZHA0MPa0a0Q2N8L6UR8nJMIPXTgzcCQtLPWLF7pauKm5cTHvmZm51d-4gcTSb5S91ZELTosaLV8XEocieJ5C2bwafODDTBjFU8m0WpNx9i0L8iB_VvRdevqcS31UrvC1cSJoPUOxUkSV3j9WkiyvTc63sEvCFUiY0loHNPIQg9kamRm7M2_fMOSnUOQ9wGnBGAr74n9NMG4SRFMAed7zBqdnjByaUITwgaZ7oQFRSKI1PzPSz-d-_tZKEUt6WOujs5wxu3z0cZDoBnRupfSs9na-X9X4BOe_6F--qxnYp-g";

async function run() {
    try {
        const res = await fetch('http://localhost:8080/api/tournaments/694181c0c0ed0925650407a9/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ action: 'complete_tournament' })
        });

        if (res.status === 204) {
            console.log('Success (204)');
            return;
        }

        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error(e);
    }
}

run();
