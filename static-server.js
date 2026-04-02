const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = process.cwd();

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    let filePath = path.join(ROOT, req.url.split('?')[0].split('#')[0]);
    if (filePath === ROOT || filePath.endsWith('\\') || filePath.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Try .html fallback for clean URLs
                if (!path.extname(filePath)) {
                    const fallbackPath = filePath + '.html';
                    fs.readFile(fallbackPath, (fallbackError, fallbackContent) => {
                        if (!fallbackError) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(fallbackContent, 'utf-8');
                            return;
                        }
                        res.writeHead(404);
                        res.end('File not found');
                    });
                } else {
                    res.writeHead(404);
                    res.end('File not found');
                }
            } else {
                res.writeHead(500);
                res.end(`Server error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, () => {
    console.log(`Static server running at http://localhost:${PORT}/`);
    console.log(`Root: ${ROOT}`);
});
