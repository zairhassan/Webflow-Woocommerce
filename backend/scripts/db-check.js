const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE CHECK ---');
    const stores = await prisma.store.findMany({
        include: { apiKeys: true }
    });

    stores.forEach(s => {
        console.log(`Store: ${s.name} (ID: ${s.id})`);
        s.apiKeys.forEach(k => {
            console.log(`  - Key: ${k.publicKey} (Active: ${k.isActive})`);
        });
    });

    const products = await prisma.product.findMany({
        where: { slug: 'aura-puffer-jacket' },
        include: { store: true }
    });
    console.log('\n--- PRODUCT CHECK (aura-puffer-jacket) ---');
    products.forEach(p => console.log(` - Title: ${p.title}\n   Slug: ${p.slug}\n   Store: ${p.store.name} (ID: ${p.store.id})\n   Published: ${p.isPublished}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
