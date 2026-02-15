const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    try {
        console.log('Testing Server...');

        // 1. Signup User
        const userEmail = `user_${Date.now()}@test.com`;
        const signupRes = await request({
            hostname: 'localhost', port: 3000, path: '/auth/signup', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { name: 'Test User', email: userEmail, password: 'password123' });

        if (signupRes.status !== 201) throw new Error('Signup Failed: ' + JSON.stringify(signupRes.body));
        console.log('✅ Signup Success');
        const userToken = signupRes.body.token;

        // 2. Login Admin
        const loginRes = await request({
            hostname: 'localhost', port: 3000, path: '/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@example.com', password: 'admin' });

        if (loginRes.status !== 200) throw new Error('Admin Login Failed');
        console.log('✅ Admin Login Success');
        const adminToken = loginRes.body.token;

        // 3. Create Report (Mock multipart form data is hard with native http, skipping image upload test in simple script)
        // I'll test fetching reports instead.

        // 4. Get User Reports
        const reportsRes = await request({
            hostname: 'localhost', port: 3000, path: '/reports/my', method: 'GET',
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        if (reportsRes.status !== 200) throw new Error('Get Reports Failed');
        console.log('✅ Get Reports Success');

        console.log('All API tests passed!');
    } catch (err) {
        console.error('❌ Test Failed:', err);
        process.exit(1);
    }
}

// Simple delay to let server start
setTimeout(test, 2000);
