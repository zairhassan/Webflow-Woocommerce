const prisma = require('../lib/prisma');
const { testSmtpConnection } = require('../lib/email');

// Get store settings
const getSettings = async (req, res) => {
    const store = await prisma.store.findUnique({
        where: { id: req.storeId },
        include: { apiKeys: { where: { isActive: true } } }
    });

    const storeAddr = store.storeAddress || {};

    res.json({
        settings: {
            name: store.name,
            email: store.ownerEmail,
            currency: store.defaultCurrency,
            webflowSiteId: store.webflowSiteId,
            stripeConfigured: !!store.stripeSecretKey,
            enableTax: store.enableTax,
            enableCoupons: store.enableCoupons,
            enableReviews: store.enableReviews,
            weightUnit: store.weightUnit,
            dimensionUnit: store.dimensionUnit,
            smtp: {
                host: storeAddr.smtpHost || '',
                port: storeAddr.smtpPort || '587',
                user: storeAddr.smtpUser || '',
                from: storeAddr.smtpFrom || '',
                configured: !!(storeAddr.smtpHost && storeAddr.smtpUser)
            },
            apiKeys: store.apiKeys.map(k => ({
                id: k.id,
                publicKey: k.publicKey,
                isActive: k.isActive,
                createdAt: k.createdAt
            }))
        }
    });
};

// Update store settings
const updateSettings = async (req, res, next) => {
    try {
        const { name, currency, webflowSiteId, stripeSecretKey, enableTax, enableCoupons, enableReviews, weightUnit, dimensionUnit, smtp } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (currency) updateData.defaultCurrency = currency.toUpperCase();
        if (webflowSiteId !== undefined) updateData.webflowSiteId = webflowSiteId;
        if (stripeSecretKey !== undefined) updateData.stripeSecretKey = stripeSecretKey;
        if (enableTax !== undefined) updateData.enableTax = enableTax;
        if (enableCoupons !== undefined) updateData.enableCoupons = enableCoupons;
        if (enableReviews !== undefined) updateData.enableReviews = enableReviews;
        if (weightUnit !== undefined) updateData.weightUnit = weightUnit;
        if (dimensionUnit !== undefined) updateData.dimensionUnit = dimensionUnit;

        // SMTP settings go into storeAddress JSON
        if (smtp) {
            const store = await prisma.store.findUnique({ where: { id: req.storeId }, select: { storeAddress: true } });
            const current = store?.storeAddress || {};
            updateData.storeAddress = {
                ...current,
                smtpHost: smtp.host || current.smtpHost,
                smtpPort: smtp.port || current.smtpPort || '587',
                smtpUser: smtp.user || current.smtpUser,
                smtpPass: smtp.pass || current.smtpPass,
                smtpFrom: smtp.from || current.smtpFrom
            };
        }

        await prisma.store.update({
            where: { id: req.storeId },
            data: updateData
        });

        res.json({ message: 'Settings updated' });
    } catch (error) {
        next(error);
    }
};

// Test SMTP connection
const testSmtp = async (req, res) => {
    try {
        const { host, port, user, pass } = req.body;
        if (!host || !user || !pass) {
            return res.status(400).json({ error: 'Host, user, and password are required' });
        }
        const result = await testSmtpConnection({ smtpHost: host, smtpPort: port || '587', smtpUser: user, smtpPass: pass });
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSettings, updateSettings, testSmtp };
