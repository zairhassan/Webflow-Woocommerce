async function checkApi() {
    try {
        const res = await fetch('http://127.0.0.1:5001/api/v1/public/products?featured=true', {
            headers: { 'x-store-key': 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df' }
        });
        const data = await res.json();
        console.log('Products found:', data.products.length);
        data.products.forEach((p, i) => {
            console.log(`Product ${i+1}:`, {
                id: p.id,
                title: p.title,
                slug: p.slug,
                has_id: !!p.id,
                has_title: !!p.title
            });
        });
    } catch (e) {
        console.error('API Error:', e.message);
    }
}

checkApi();
