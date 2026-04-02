const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const realToken = jwt.sign(
    { storeId: '680b8386-6d3c-4b7c-8fa8-babd76562fdb', email: 'zairh09@gmail.com', type: 'admin' },
    process.env.JWT_SECRET || 'fallback-secret-if-not-loaded',
    { expiresIn: '30d' }
);

fetch('http://localhost:5001/api/v1/admin/orders?page=1&limit=20', {
    headers: { 'Authorization': `Bearer ${realToken}` }
})
    .then(res => res.text().then(text => ({ status: res.status, text })))
    .then(data => {
        fs.writeFileSync('test_out.json', JSON.stringify(data, null, 2));
        console.log('Done writing to test_out.json');
    })
    .catch(console.error);
