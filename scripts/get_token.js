
const AUTH_URL = 'http://localhost:8080/auth/realms/bracketofdeathsite/protocol/openid-connect/token';
const AUTH_URL_NO_PREFIX = 'http://localhost:8080/realms/bracketofdeathsite/protocol/openid-connect/token';

async function getToken() {
    const params = new URLSearchParams();
    params.append('client_id', 'bod-app');
    params.append('username', 'admin');
    params.append('password', 'admin123'); // Try admin123 first (from test script)
    params.append('grant_type', 'password');

    // Try with /auth prefix first
    try {
        console.error('Trying ' + AUTH_URL);
        let res = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (res.status === 404 || res.status === 405) {
            console.error('Failed with /auth, trying without prefix...');
            res = await fetch(AUTH_URL_NO_PREFIX, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
        }

        if (!res.ok) {
            console.error('Login Failed:', res.status, await res.text());
            process.exit(1);
        }

        const data = await res.json();
        console.log(data.access_token);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

getToken();
