require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe');
const prisma = new PrismaClient();

async function testPayments() {
    console.log('--- Payment Gateway Diagnostic Tool ---');

    try {
        // 1. Fetch Store that HAS gateways configured
        const store = await prisma.store.findFirst({
            where: { paymentGateways: { some: {} } },
            include: { paymentGateways: true }
        });

        if (!store) {
            console.warn('⚠️ Warning: No stores found with configured payment gateways.');
            // Fallback to any store
            const anyStore = await prisma.store.findFirst();
            if (!anyStore) {
                console.error('❌ Error: No stores found in database.');
                process.exit(1);
            }
            console.log(`✅ Store Found (but no gateways): ${anyStore.name} (ID: ${anyStore.id})`);
            return;
        }

        console.log(`✅ Store Found: ${store.name} (ID: ${store.id})`);
        console.log(`📊 Total Gateways Configured: ${store.paymentGateways.length}`);

        for (const gateway of store.paymentGateways) {
            const status = gateway.isActive ? '🟢 ACTIVE' : '⚪ INACTIVE';
            console.log(`   - ${gateway.name} (${gateway.provider}): ${status}`);

            if (gateway.provider === 'stripe') {
                await testStripe(gateway.config);
            }
        }

    } catch (err) {
        console.error('❌ Critical Error during diagnostic:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

async function testStripe(config) {
    const isTest = config && config.testMode;
    const pubKey = isTest ? config.testPublicKey : config.publicKey;
    const secKey = isTest ? config.testSecretKey : config.secretKey;

    console.log(`   🔍 Testing Stripe (${isTest ? 'TEST' : 'LIVE'}) Connectivity...`);
    
    if (!pubKey || !secKey) {
        console.log(`   ⚠️ Stripe: Missing ${isTest ? 'test' : 'live'} keys in config.`);
        return;
    }

    try {
        const stripeClient = stripe(secKey);
        // Attempt a simple API call (list first product or balance)
        const balance = await stripeClient.balance.retrieve();
        console.log(`   ✅ Stripe: Successfully connected (${isTest ? 'TEST' : 'LIVE'})! Balance available:`, balance.available.map(b => `${b.amount/100} ${b.currency}`).join(', '));
    } catch (err) {
        console.log(`   ❌ Stripe: Connection failed (${isTest ? 'TEST' : 'LIVE'}) -`, err.message);
    }
}

testPayments();
