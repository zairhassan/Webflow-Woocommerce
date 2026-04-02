const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const products = await prisma.product.findMany({
            select: { id: true, title: true, slug: true }
        });
        console.log('--- Product Slugs ---');
        products.forEach(p => console.log(`Slug: ${p.slug} | Title: ${p.title}`));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
