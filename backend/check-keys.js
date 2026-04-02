const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStoreKeys() {
    const storeId = '680b8386-6d3c-4b7c-8fa8-babd76562fdb';
    const keys = await prisma.apiKey.findMany({
        where: { storeId }
    });
    
    console.log(`Store ID: ${storeId}`);
    keys.forEach(k => {
        console.log(`- Key: ${k.publicKey} (Active: ${k.isActive})`);
    });
}

checkStoreKeys()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
