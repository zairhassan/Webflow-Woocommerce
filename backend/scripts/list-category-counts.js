const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const storeId = '680b8386-6d3c-4b7c-8fa8-babd76562fdb';
    const cats = await prisma.category.findMany({
        where: { storeId },
        include: {
            products: {
                include: {
                    product: true
                }
            }
        }
    });
    console.log('Category Product Counts:');
    cats.forEach(c => {
        console.log(`- ${c.name} (${c.slug}): ${c.products.length} products`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
