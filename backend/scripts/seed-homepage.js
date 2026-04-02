const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const storeKey = 'pk_live_7c831e9d2c1d45d8b4c72b979f7ca3da';

    // Find the store
    const apiKey = await prisma.apiKey.findUnique({
        where: { publicKey: storeKey },
        include: { store: true }
    });

    if (!apiKey) {
        console.error('Store not found for key:', storeKey);
        return;
    }

    const storeId = apiKey.storeId;
    console.log('Seeding products for store:', apiKey.store.name, '(', storeId, ')');

    const products = [
        { title: 'Modern Stealth Watch', basePrice: 299, salePrice: 249, slug: 'modern-stealth-watch', isFeatured: true, featuredImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' },
        { title: 'Pro Noise-Canceling Buds', basePrice: 199, slug: 'pro-noise-canceling-buds', isFeatured: true, featuredImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
        { title: 'Premium Leather Wallet', basePrice: 89, slug: 'premium-leather-wallet', isFeatured: true, featuredImage: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80' },
        { title: 'Minimalist Work Desk', basePrice: 549, slug: 'minimalist-work-desk', isFeatured: true, featuredImage: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80' },
        { title: 'Ergonomic Mesh Chair', basePrice: 349, salePrice: 299, slug: 'ergonomic-mesh-chair', isFeatured: true, featuredImage: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=600&q=80' }
    ];

    for (const p of products) {
        try {
            await prisma.product.upsert({
                where: { storeId_slug: { storeId, slug: p.slug } },
                update: { ...p, storeId },
                create: { ...p, storeId }
            });
            console.log('Upserted:', p.title);
        } catch (e) {
            console.error('Failed:', p.title, e.message);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
