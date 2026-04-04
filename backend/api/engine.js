const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    try {
        const sdkPath = path.join(__dirname, 'sdk.txt');
        const sdkContent = fs.readFileSync(sdkPath, 'utf8');
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); 
        res.status(200).send(sdkContent);
    } catch (error) {
        console.error('[SDK-Server] Error reading SDK file:', error);
        res.status(500).send('console.error("SDK Load Error");');
    }
};
