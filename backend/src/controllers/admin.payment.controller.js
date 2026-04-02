const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all payment gateways for the store
exports.getGateways = async (req, res) => {
    try {
        const storeId = req.store.id;
        
        // Ensure standard gateways exist for this store
        const providers = [
            { provider: 'stripe', name: 'Stripe', description: 'Credit/Debit Card payments via Stripe' },
            { provider: 'jazzcash', name: 'JazzCash', description: 'Mobile wallet and bank payments in Pakistan' },
            { provider: 'easypaisa', name: 'EasyPaisa', description: 'Popular mobile wallet in Pakistan' },
            { provider: 'cod', name: 'Cash on Delivery', description: 'Pay when items are delivered' }
        ];

        for (const p of providers) {
            await prisma.paymentGateway.upsert({
                where: { storeId_provider: { storeId, provider: p.provider } },
                update: {},
                create: {
                    storeId,
                    provider: p.provider,
                    name: p.name,
                    description: p.description,
                    isActive: false,
                    config: {}
                }
            });
        }

        const gateways = await prisma.paymentGateway.findMany({
            where: { storeId },
            orderBy: { createdAt: 'asc' }
        });

        res.json({ gateways });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a payment gateway
exports.updateGateway = async (req, res) => {
    try {
        const storeId = req.store.id;
        const { provider } = req.params;
        const { isActive, config, name, description } = req.body;

        const gateway = await prisma.paymentGateway.update({
            where: { storeId_provider: { storeId, provider } },
            data: {
                isActive,
                config,
                name,
                description,
                updatedAt: new Date()
            }
        });

        res.json({ message: `${name} updated successfully`, gateway });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Public: Get active gateways for checkout
exports.getActiveGateways = async (req, res) => {
    try {
        const { storeId } = req; // From middleware or query
        const gateways = await prisma.paymentGateway.findMany({
            where: { storeId, isActive: true },
            select: {
                provider: true,
                name: true,
                description: true,
                config: true
            }
        });

        // Sanitize config to remove sensitive data
        const sanitizedGateways = gateways.map(g => {
            const sanitizedConfig = { ...g.config };
            // Remove known secrets (keep only public or harmless info)
            delete sanitizedConfig.secretKey;
            delete sanitizedConfig.testSecretKey;
            delete sanitizedConfig.apiKey;
            delete sanitizedConfig.apiPassword;
            delete sanitizedConfig.password;
            delete sanitizedConfig.hashKey;
            delete sanitizedConfig.privateKey;
            return {
                provider: g.provider,
                name: g.name,
                description: g.description,
                config: sanitizedConfig
            };
        });

        res.json({ gateways: sanitizedGateways });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
