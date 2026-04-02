const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DIST_ROOT = path.join(__dirname, 'dashboard/dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.json': 'application/json'
};

http.createServer((req, res) => {
    let filePath = path.join(DIST_ROOT, req.url.split('?')[0]);
    if (filePath === DIST_ROOT || filePath.endsWith('\\') || filePath.endsWith('/')) {
        filePath = path.join(DIST_ROOT, 'index.html');
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Return index.html for SPA routing if file not found
                fs.readFile(path.join(DIST_ROOT, 'index.html'), (err, indexContent) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, '127.0.0.1', () => {
    console.log(`Dashboard Server running at http://127.0.0.1:${PORT}/`);
});
