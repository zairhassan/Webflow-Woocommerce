const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const storeId = '680b8386-6d3c-4b7c-8fa8-babd76562fdb';
    const categories = await prisma.category.findMany({
        where: { storeId }
    });
    console.log('Categories for Store:', storeId);
    categories.forEach(c => console.log(`- ${c.name} (Slug: ${c.slug})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
