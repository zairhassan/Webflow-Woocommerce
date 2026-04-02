const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Authenticate admin via JWT token (for dashboard)
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const store = await prisma.store.findUnique({
            where: { id: decoded.storeId },
            include: { apiKeys: { where: { isActive: true }, take: 1 } }
        });

        if (!store || !store.isActive) {
            return res.status(401).json({ error: 'Store not found or inactive' });
        }

        req.store = store;
        req.storeId = store.id;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        next(error);
    }
};

// Authenticate public requests via X-Store-Key header (for engine.js)
const authenticatePublicKey = async (req, res, next) => {
    try {
        const storeKey = req.headers['x-store-key'] || req.query.storeKey;
        if (!storeKey) {
            return res.status(401).json({ error: 'Store key required (X-Store-Key header)' });
        }

        const apiKey = await prisma.apiKey.findUnique({
            where: { publicKey: storeKey },
            include: { store: true }
        });

        if (!apiKey || !apiKey.isActive || !apiKey.store.isActive) {
            return res.status(401).json({ error: 'Invalid store key' });
        }

        req.store = apiKey.store;
        req.storeId = apiKey.store.id;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateAdmin, authenticatePublicKey };
