const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/v1/public/products?limit=1',
    method: 'GET',
    headers: {
        'X-Store-Key': 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('DATA:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('BODY:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
