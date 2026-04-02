const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Diagnostic ---');
    try {
        const stores = await prisma.store.findMany({
            include: { apiKeys: true }
        });
        console.log(`Found ${stores.length} stores.`);
        stores.forEach(s => {
            console.log(`Store: ${s.name} (ID: ${s.id})`);
            s.apiKeys.forEach(k => {
                console.log(`  - API Key: ${k.publicKey} (Active: ${k.isActive})`);
            });
        });

        const products = await prisma.product.count();
        console.log(`Total Products: ${products}`);

        const categories = await prisma.category.count();
        console.log(`Total Categories: ${categories}`);

    } catch (e) {
        console.error('Error connecting to database:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
