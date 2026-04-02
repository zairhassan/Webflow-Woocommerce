
const API_URL = 'http://127.0.0.1:5001';
const STORE_KEY = 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df';

async function listProducts() {
    try {
        const res = await fetch(`${API_URL}/api/v1/public/products`, {
            headers: { 'x-store-key': STORE_KEY }
        });
        const data = await res.json();
        console.log('All Products:', JSON.stringify(data.products.map(p => ({ title: p.title, slug: p.slug })), null, 2));
    } catch (e) {
        console.error('Error listing products:', e);
    }
}

listProducts();
