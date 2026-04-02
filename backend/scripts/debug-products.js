const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const storeId = '680b8386-6d3c-4b7c-8fa8-babd76562fdb'; // Zair Lifestyle Store
    console.log(`--- Products in Store ${storeId} ---`);

    try {
        const products = await prisma.product.findMany({
            where: { storeId },
            include: {
                variants: true,
                productCategories: { include: { category: true } }
            }
        });

        products.forEach(p => {
            console.log(`Product: ${p.title} (${p.slug})`);
            console.log(`  Price: ${p.basePrice}`);
            console.log(`  Short Desc: ${p.shortDescription ? 'Yes' : 'No'}`);
            console.log(`  Featured Image: ${p.featuredImage}`);
            console.log(`  Variants: ${p.variants.length}`);
            p.variants.forEach(v => {
                console.log(`    - Variant SKU: ${v.sku}, Price: ${v.price}, Size/Color: ${JSON.stringify(v.attributes)}`);
            });
            console.log(`  Categories: ${p.productCategories.map(pc => pc.category.name).join(', ')}`);
            console.log('----------------------------');
        });
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
