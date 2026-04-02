// Native fetch available in Node 18+

async function testConnection() {
    const url = 'http://127.0.0.1:5001/api/v1/public/products/aura-puffer-jacket';
    const storeKey = 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df';

    console.log(`Testing connection to: ${url}`);
    try {
        const res = await fetch(url, {
            headers: { 'X-Store-Key': storeKey }
        });
        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Data received:', JSON.stringify(data).substring(0, 100) + '...');
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

testConnection();
