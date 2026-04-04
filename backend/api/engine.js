const sdk = require('./sdk.json');

module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1 hour 46
    res.status(200).send(sdk.code || sdk);
};
