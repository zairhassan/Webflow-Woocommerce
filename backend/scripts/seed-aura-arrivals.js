const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const storeId = '680b8386-6d3c-4b7c-8fa8-babd76562fdb'; // Verified Zair Lifestyle Store ID

    console.log('Seeding Aura Arrivals for store:', storeId);

    // Ensure Categories exist
    const categories = [
        { name: 'Outerwear', slug: 'outerwear' },
        { name: 'Technical Gear', slug: 'technical' },
        { name: 'Bottoms', slug: 'bottoms' }
    ];

    const catMap = {};
    for (const c of categories) {
        try {
            const cat = await prisma.category.upsert({
                where: { storeId_slug: { storeId, slug: c.slug } },
                update: { name: c.name },
                create: { ...c, storeId }
            });
            catMap[c.slug] = cat.id;
            console.log('Upserted category:', c.name);
        } catch (e) {
            console.error('Category error:', c.name, e.message);
        }
    }

    const products = [
        {
            title: 'Stealth Puffer Jacket',
            slug: 'stealth-puffer',
            basePrice: 349.00,
            salePrice: 289.00,
            description: 'Hyper-performance matte black puffer with advanced thermal regulation.',
            featuredImage: '/uploads/arrivals_1.png',
            isFeatured: true,
            isPublished: true,
            visibility: 'visible',
            categorySlug: 'outerwear'
        },
        {
            title: 'Titan Tactical Cargo',
            slug: 'titan-cargo',
            basePrice: 145.00,
            description: 'Reinforced charcoal grey tactical pants with water-repellent finish.',
            featuredImage: '/uploads/arrivals_2.png',
            isFeatured: true,
            isPublished: true,
            visibility: 'visible',
            categorySlug: 'bottoms'
        },
        {
            title: 'Aura Utility Vest',
            slug: 'aura-vest',
            basePrice: 189.00,
            description: 'High-detail deep olive utility vest for technical layering.',
            featuredImage: '/uploads/arrivals_3.png',
            isFeatured: true,
            isPublished: true,
            visibility: 'visible',
            categorySlug: 'technical'
        },
        {
            title: 'Alpine Shell Series',
            slug: 'alpine-shell',
            basePrice: 260.00,
            description: 'Minimalist stone grey waterproof shell for extreme conditions.',
            featuredImage: '/uploads/arrivals_4.png',
            isFeatured: true,
            isPublished: true,
            visibility: 'visible',
            categorySlug: 'outerwear'
        }
    ];

    for (const p of products) {
        try {
            const { categorySlug, ...pData } = p;
            const product = await prisma.product.upsert({
                where: { storeId_slug: { storeId, slug: p.slug } },
                update: { ...pData, storeId },
                create: { ...pData, storeId }
            });

            // Link category
            if (catMap[categorySlug]) {
                await prisma.productCategory.upsert({
                    where: {
                        productId_categoryId: {
                            productId: product.id,
                            categoryId: catMap[categorySlug]
                        }
                    },
                    update: {},
                    create: {
                        productId: product.id,
                        categoryId: catMap[categorySlug]
                    }
                });
            }

            console.log('Upserted product:', p.title);
        } catch (e) {
            console.error('Product error:', p.title, e.message);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
