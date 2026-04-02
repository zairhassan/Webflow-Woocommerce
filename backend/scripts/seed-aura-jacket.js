const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'zairh09@gmail.com';
    const store = await prisma.store.findUnique({
        where: { ownerEmail: email }
    });

    if (!store) {
        console.error('Store not found for', email);
        return;
    }

    const storeId = store.id;
    const slug = 'aura-puffer-jacket';

    console.log('Seeding Aura Puffer Jacket into store:', store.name);

    const product = await prisma.product.upsert({
        where: { storeId_slug: { storeId, slug } },
        update: {
            title: 'Aura Premium Puffer',
            description: 'Experience pure warmth and high-fashion aesthetics. The Aura Puffer features 750-fill power insulation and a weather-resistant shell designed for the modern explorer.',
            basePrice: 199,
            isFeatured: true,
            featuredImage: 'https://png.pngtree.com/png-vector/20250321/ourmid/pngtree-vibrant-orange-t-shirt-mockup-hangs-ready-for-styling-png-image_15801013.png',
            productType: 'variable'
        },
        create: {
            storeId,
            slug,
            title: 'Aura Premium Puffer',
            description: 'Experience pure warmth and high-fashion aesthetics. The Aura Puffer features 750-fill power insulation and a weather-resistant shell designed for the modern explorer.',
            basePrice: 199,
            isFeatured: true,
            featuredImage: 'https://png.pngtree.com/png-vector/20250321/ourmid/pngtree-vibrant-orange-t-shirt-mockup-hangs-ready-for-styling-png-image_15801013.png',
            productType: 'variable'
        }
    });

    // Variants mapping reference site colors with original transparent jacket images
    const baseVariants = [
        { color: 'Bright Orange', price: 199, imageUrl: 'https://png.pngtree.com/png-vector/20250321/ourmid/pngtree-vibrant-orange-t-shirt-mockup-hangs-ready-for-styling-png-image_15801013.png', baseSku: 'AURA-ORG' },
        { color: 'Olive Green', price: 210, imageUrl: 'https://png.pngtree.com/png-vector/20231018/ourmid/pngtree-dark-green-t-shirt-with-hanger-png-image_10205775.png', baseSku: 'AURA-OLV' },
        { color: 'Royal Purple', price: 225, imageUrl: 'https://png.pngtree.com/png-vector/20250305/ourmid/pngtree-blank-royal-blue-t-shirt-on-wooden-hanger-png-image_15723313.png', baseSku: 'AURA-PUR' }
    ];

    const sizes = ['S', 'M', 'L'];
    const variants = [];

    for (const v of baseVariants) {
        for (const size of sizes) {
            variants.push({
                attributes: { Color: v.color, Size: size },
                price: v.price,
                imageUrl: v.imageUrl,
                sku: `${v.baseSku}-${size}`
            });
        }
    }

    await prisma.variant.deleteMany({ where: { productId: product.id } });

    for (const v of variants) {
        await prisma.variant.create({
            data: {
                productId: product.id,
                price: v.price,
                attributes: v.attributes,
                imageUrl: v.imageUrl,
                sku: v.sku,
                stockStatus: 'in_stock',
                stockQuantity: 50
            }
        });
    }

    console.log('Aura Puffer Jacket seeded successfully with 3 variants.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
