const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const cats = await prisma.category.findMany({
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });
        console.log(JSON.stringify(cats.map(c => ({
            name: c.name,
            slug: c.slug,
            count: c._count.products
        })), null, 2));
        
        const products = await prisma.product.findMany({
            where: { isPublished: true },
            select: { title: true, slug: true }
        });
        console.log('Published Products:', products);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
