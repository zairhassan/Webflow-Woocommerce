const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const keys = await prisma.apiKey.findMany({
            include: { store: true }
        });
        console.log(`Found ${keys.length} API keys:`);
        keys.forEach(k => {
            console.log(` - Store: ${k.store.name}`);
            console.log(`   Public Key: ${k.publicKey}`);
            console.log(`   Active: ${k.isActive}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
