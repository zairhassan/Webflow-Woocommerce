async function checkWishlistApi() {
    try {
        const res = await fetch('http://127.0.0.1:5001/api/v1/customer/wishlist', {
            headers: { 
                'x-store-key': 'pk_live_6bf90196f1ba428e8f1ff44fa3d506df'
                // Assuming no auth needed for this specific test or if it returns public part
            }
        });
        const data = await res.json();
        console.log('Wishlist data:', data.wishlist ? data.wishlist.length : 'No wishlist field');
        if (data.wishlist && data.wishlist.length > 0) {
            console.log('First item keys:', Object.keys(data.wishlist[0]));
            console.log('First item productId:', data.wishlist[0].productId);
        }
    } catch (e) {
        console.error('API Error:', e.message);
    }
}

checkWishlistApi();
