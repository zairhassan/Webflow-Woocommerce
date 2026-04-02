const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    const email = 'zairh09@gmail.com';
    const password = 'zair1214';
    const storeName = 'Zair Lifestyle Store';

    console.log('--- Starting Custom Seeding for', email, '---');

    // 1. Create or Find Store
    const passwordHash = await bcrypt.hash(password, 12);
    let store = await prisma.store.findUnique({
        where: { ownerEmail: email },
        include: { apiKeys: true }
    });

    if (!store) {
        console.log('Creating new store...');
        store = await prisma.store.create({
            data: {
                name: storeName,
                ownerEmail: email,
                passwordHash,
                apiKeys: {
                    create: {
                        publicKey: `pk_live_${uuidv4().replace(/-/g, '')}`,
                        secretKey: `sk_live_${uuidv4().replace(/-/g, '')}`
                    }
                }
            },
            include: { apiKeys: true }
        });
    } else {
        console.log('Store already exists. Updating password...');
        await prisma.store.update({
            where: { id: store.id },
            data: { passwordHash, name: storeName }
        });
    }

    const storeId = store.id;
    const storeKey = store.apiKeys[0].publicKey;
    console.log('Store ID:', storeId);
    console.log('Public Store Key:', storeKey);

    // 2. Clear existing products (optional, but requested fresh data)
    // await prisma.product.deleteMany({ where: { storeId } });

    // 3. Create Categories
    const categories = [
        { name: 'Shirts', slug: 'shirts' },
        { name: 'Shoes', slug: 'shoes' },
        { name: 'Audio', slug: 'audio' },
        { name: 'Accessories', slug: 'accessories' }
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { storeId_slug: { storeId, slug: cat.slug } },
            update: { name: cat.name },
            create: { ...cat, storeId }
        });
    }

    const catMap = {};
    const allCats = await prisma.category.findMany({ where: { storeId } });
    allCats.forEach(c => catMap[c.slug] = c.id);

    // 4. Products Data
    const products = [
        // SHIRTS (3)
        {
            title: 'Essential Cotton Tee',
            slug: 'essential-cotton-tee',
            basePrice: 25,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shirts',
            productType: 'simple'
        },
        {
            title: 'Premium Flannel Shirt',
            slug: 'premium-flannel-shirt',
            basePrice: 45,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shirts',
            productType: 'variable',
            variants: [
                { attributes: { color: 'Red', size: 'M' }, price: 45, imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80' },
                { attributes: { color: 'Blue', size: 'M' }, price: 45, imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80' }
            ]
        },
        {
            title: 'Classic Polo Shirt',
            slug: 'classic-polo-shirt',
            basePrice: 35,
            isFeatured: false,
            featuredImage: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shirts',
            productType: 'simple'
        },
        // SHOES (3)
        {
            title: 'Urban Street Sneakers',
            slug: 'urban-street-sneakers',
            basePrice: 120,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shoes',
            productType: 'simple'
        },
        {
            title: 'Performance Pro Runners',
            slug: 'performance-pro-runners',
            basePrice: 150,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1582587319032-5a3d7b372675?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shoes',
            productType: 'variable',
            variants: [
                { attributes: { color: 'Black', size: '10' }, price: 150, imageUrl: 'https://images.unsplash.com/photo-1582587319032-5a3d7b372675?auto=format&fit=crop&w=600&q=80' },
                { attributes: { color: 'White', size: '10' }, price: 150, imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80' }
            ]
        },
        {
            title: 'Elegant Leather Loafers',
            slug: 'elegant-leather-loafers',
            basePrice: 180,
            isFeatured: false,
            featuredImage: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'shoes',
            productType: 'simple'
        },
        // AIRPODS (3)
        {
            title: 'Apple AirPods Pro',
            slug: 'apple-airpods-pro',
            basePrice: 249,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1588423713664-87d51eeaeac0?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'audio',
            productType: 'simple'
        },
        {
            title: 'Apple AirPods 3rd Gen',
            slug: 'apple-airpods-3rd-gen',
            basePrice: 179,
            isFeatured: false,
            featuredImage: 'https://images.unsplash.com/photo-1588156979435-379b9d802b0a?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'audio',
            productType: 'simple'
        },
        {
            title: 'Premium Wireless Over-Ear',
            slug: 'premium-wireless-over-ear',
            basePrice: 349,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'audio',
            productType: 'simple'
        },
        // CAP (1)
        {
            title: 'Heritage Baseball Cap',
            slug: 'heritage-baseball-cap',
            basePrice: 30,
            isFeatured: true,
            featuredImage: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80',
            categorySlug: 'accessories',
            productType: 'simple'
        }
    ];

    for (const p of products) {
        try {
            const { categorySlug, variants, ...productData } = p;
            const categoryId = catMap[categorySlug];

            const createdProduct = await prisma.product.upsert({
                where: { storeId_slug: { storeId, slug: p.slug } },
                update: { ...productData, storeId },
                create: { ...productData, storeId }
            });

            // Assign category
            if (categoryId) {
                await prisma.productCategory.upsert({
                    where: { productId_categoryId: { productId: createdProduct.id, categoryId } },
                    update: {},
                    create: { productId: createdProduct.id, categoryId }
                });
            }

            // Create variants
            if (variants && variants.length > 0) {
                // Delete old variants for a clean sync
                await prisma.variant.deleteMany({ where: { productId: createdProduct.id } });
                await prisma.variant.createMany({
                    data: variants.map((v, i) => ({
                        productId: createdProduct.id,
                        price: v.price,
                        attributes: v.attributes,
                        imageUrl: v.imageUrl,
                        menuOrder: i
                    }))
                });
            }

            console.log('Upserted Product:', p.title);
        } catch (e) {
            console.error('Failed Product:', p.title, e.message);
        }
    }

    console.log('--- Custom Seeding Complete ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
