const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /customer/wishlist — Get customer's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const items = await prisma.wishlistItem.findMany({
            where: { customerId: req.customerId, storeId: req.storeId },
            include: {
                product: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        basePrice: true,
                        salePrice: true,
                        salePriceFrom: true,
                        salePriceTo: true,
                        featuredImage: true,
                        stockStatus: true,
                        isPublished: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const wishlist = items
            .filter(item => item.product.isPublished)
            .map(item => {
                const p = item.product;
                const now = new Date();
                const saleActive = p.salePrice &&
                    (!p.salePriceFrom || new Date(p.salePriceFrom) <= now) &&
                    (!p.salePriceTo || new Date(p.salePriceTo) >= now);

                return {
                    id: item.id,
                    productId: p.id,
                    title: p.title,
                    slug: p.slug,
                    price: parseFloat(p.basePrice),
                    salePrice: saleActive ? parseFloat(p.salePrice) : null,
                    onSale: !!saleActive,
                    imageUrl: p.featuredImage,
                    inStock: p.stockStatus !== 'outofstock',
                    addedAt: item.createdAt
                };
            });

        res.json({ wishlist, count: wishlist.length });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
};

// POST /customer/wishlist — Add product to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ error: 'productId is required' });

        // Verify product exists and belongs to store (try ID first, then slug)
        const product = await prisma.product.findFirst({
            where: {
                storeId: req.storeId,
                isPublished: true,
                OR: [
                    { id: productId },
                    { slug: productId }
                ]
            }
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // IMPORTANT: Always use the UUID from the database for the upsert
        const actualProductId = product.id;

        // Upsert to avoid duplicates
        const item = await prisma.wishlistItem.upsert({
            where: {
                customerId_productId: {
                    customerId: req.customerId,
                    productId: actualProductId
                }
            },
            update: {},
            create: {
                customerId: req.customerId,
                productId: actualProductId,
                storeId: req.storeId
            }
        });

        res.json({ success: true, message: 'Added to wishlist', itemId: item.id });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
};

// DELETE /customer/wishlist/:productId — Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params; // This might be an ID or a Slug

        // Find the product first to get the actual UUID
        const product = await prisma.product.findFirst({
            where: {
                storeId: req.storeId,
                OR: [
                    { id: productId },
                    { slug: productId }
                ]
            }
        });

        const actualProductId = product ? product.id : productId;

        await prisma.wishlistItem.deleteMany({
            where: {
                customerId: req.customerId,
                productId: actualProductId,
                storeId: req.storeId
            }
        });

        res.json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
};

// POST /customer/wishlist/check — Check if products are in wishlist (batch)
exports.checkWishlist = async (req, res) => {
    try {
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ error: 'productIds array is required' });
        }

        // Resolve all IDs/Slugs to actual IDs first
        const products = await prisma.product.findMany({
            where: {
                storeId: req.storeId,
                OR: [
                    { id: { in: productIds } },
                    { slug: { in: productIds } }
                ]
            },
            select: { id: true, slug: true }
        });

        const actualIds = products.map(p => p.id);
        const mapToId = {};
        products.forEach(p => {
            mapToId[p.id] = p.id;
            mapToId[p.slug] = p.id;
        });

        const items = await prisma.wishlistItem.findMany({
            where: {
                customerId: req.customerId,
                storeId: req.storeId,
                productId: { in: actualIds }
            },
            select: { productId: true }
        });

        const wishlistedIds = new Set(items.map(item => item.productId));
        const wishlisted = {};
        
        productIds.forEach(idOrSlug => {
            const actualId = mapToId[idOrSlug];
            wishlisted[idOrSlug] = actualId ? wishlistedIds.has(actualId) : false;
        });

        res.json({ wishlisted });
    } catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({ error: 'Failed to check wishlist' });
    }
};
