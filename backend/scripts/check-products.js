const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const store = await prisma.store.findFirst({
            where: { name: 'Zair Lifestyle Store' }
        });
        if (!store) {
            console.log('Zair Lifestyle Store not found!');
            return;
        }
        console.log(`Store: ${store.name} (ID: ${store.id})`);

        const products = await prisma.product.findMany({
            where: { storeId: store.id },
            select: { id: true, title: true }
        });
        console.log(`Products for this store: ${products.length}`);
        products.forEach(p => console.log(` - ${p.title}`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
