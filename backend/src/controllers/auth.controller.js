const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

// Generate API keys for a store
function generateApiKeys() {
    const publicKey = `pk_live_${uuidv4().replace(/-/g, '')}`;
    const secretKey = `sk_live_${uuidv4().replace(/-/g, '')}`;
    return { publicKey, secretKey };
}

// Register a new store
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email exists
        const existing = await prisma.store.findUnique({ where: { ownerEmail: email } });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const { publicKey, secretKey } = generateApiKeys();

        const store = await prisma.store.create({
            data: {
                name,
                ownerEmail: email,
                passwordHash,
                apiKeys: {
                    create: { publicKey, secretKey }
                }
            },
            include: { apiKeys: true }
        });

        const token = jwt.sign(
            { storeId: store.id, email: store.ownerEmail },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            message: 'Store created successfully',
            token,
            store: {
                id: store.id,
                name: store.name,
                email: store.ownerEmail,
                currency: store.defaultCurrency,
                apiKeys: {
                    publicKey: store.apiKeys[0].publicKey,
                    secretKey: store.apiKeys[0].secretKey
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const store = await prisma.store.findUnique({
            where: { ownerEmail: email },
            include: { apiKeys: { where: { isActive: true }, take: 1 } }
        });

        if (!store) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, store.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { storeId: store.id, email: store.ownerEmail },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            store: {
                id: store.id,
                name: store.name,
                email: store.ownerEmail,
                currency: store.defaultCurrency,
                apiKeys: store.apiKeys[0] ? {
                    publicKey: store.apiKeys[0].publicKey
                } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get current store info
const me = async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.storeId },
        include: { apiKeys: { where: { isActive: true }, take: 1 } }
    });

    res.json({
        store: {
            id: store.id,
            name: store.name,
            email: store.ownerEmail,
            currency: store.defaultCurrency,
            stripeConfigured: !!store.stripeSecretKey,
            apiKeys: store.apiKeys[0] ? {
                publicKey: store.apiKeys[0].publicKey
            } : null
        }
    });
};

module.exports = { register, login, me };
