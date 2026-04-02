
const API_URL = 'http://127.0.0.1:5001';
const STORE_KEY = 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df';

async function checkProduct() {
    try {
        const res = await fetch(`${API_URL}/api/v1/public/products/alpine-shell`, {
            headers: { 'x-store-key': STORE_KEY }
        });
        const data = await res.json();
        console.log('Alpine Product Details:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error fetching product:', e);
    }
}

checkProduct();
