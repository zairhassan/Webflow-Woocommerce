const prisma = require('../lib/prisma');
const { calculateShipping } = require('./shipping.controller');
const { calculateTax } = require('./tax.controller');

// List published products (for engine.js) — includes sale prices, categories, reviews
const getProducts = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, category, tag, search, sort = 'newest', featured, onSale } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            storeId: req.storeId,
            isPublished: true
        };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Category filter by slug
        if (category) {
            where.productCategories = {
                some: { category: { slug: category } }
            };
        }

        // Tag filter
        if (tag) {
            where.productTags = {
                some: { tag: { slug: tag } }
            };
        }

        // Sale filter
        if (onSale === 'true') {
            const now = new Date();
            where.salePrice = { not: null };
            where.AND = [
                { OR: [{ salePriceFrom: null }, { salePriceFrom: { lte: now } }] },
                { OR: [{ salePriceTo: null }, { salePriceTo: { gte: now } }] }
            ];
        }

        // Featured filter
        if (featured === 'true') {
            where.isFeatured = true;
        }

        // Batch IDs filter
        const { ids } = req.query;
        if (ids) {
            const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
            if (idList.length > 0) {
                where.OR = [
                    { id: { in: idList } },
                    { slug: { in: idList } }
                ];
            }
        }

        let orderBy = { createdAt: 'desc' };
        if (sort === 'price_asc') orderBy = { basePrice: 'asc' };
        if (sort === 'price_desc') orderBy = { basePrice: 'desc' };
        if (sort === 'title') orderBy = { title: 'asc' };
        if (sort === 'oldest') orderBy = { createdAt: 'asc' };
        if (sort === 'popular') orderBy = { menuOrder: 'asc' };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    variants: { where: { isActive: true }, orderBy: { menuOrder: 'asc' } },
                    productCategories: { include: { category: { select: { id: true, name: true, slug: true } } } },
                    productTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
                    reviews: { where: { isApproved: true }, select: { rating: true } },
                    images: { orderBy: { position: 'asc' }, take: 4 }
                },
                skip,
                take: parseInt(limit),
                orderBy
            }),
            prisma.product.count({ where })
        ]);

        res.json({
            products: products.map(p => formatProduct(p)),
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        next(error);
    }
};

// Get single product by slug
const getProductBySlug = async (req, res, next) => {
    try {
        const product = await prisma.product.findFirst({
            where: {
                slug: req.params.slug,
                storeId: req.storeId,
                isPublished: true
            },
            include: {
                variants: { where: { isActive: true }, orderBy: { menuOrder: 'asc' } },
                productCategories: { include: { category: { select: { id: true, name: true, slug: true } } } },
                productTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
                reviews: { where: { isApproved: true }, select: { id: true, rating: true, title: true, content: true, authorName: true, createdAt: true } },
                images: { orderBy: { position: 'asc' } }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product: formatProduct(product, true) });
    } catch (error) {
        next(error);
    }
};

// Validate cart items (stock check + coupon + shipping + tax)
const validateCart = async (req, res, next) => {
    try {
        const { items, couponCode, customerToken, shippingAddress } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                storeId: req.storeId,
                isPublished: true
            },
            include: { variants: true }
        });

        const validatedItems = [];
        const errors = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                errors.push({ productId: item.productId, error: 'Product not found' });
                continue;
            }

            let price = getActivePrice(product);
            let inStock = true;

            if (item.variantId) {
                const variant = product.variants.find(v => v.id === item.variantId);
                if (!variant) {
                    errors.push({ productId: item.productId, error: 'Variant not found' });
                    continue;
                }
                price = variant.salePrice ? parseFloat(variant.salePrice) : parseFloat(variant.price);
                inStock = !variant.manageStock || variant.stockQuantity >= item.quantity;
            } else if (product.manageStock) {
                inStock = product.stockQuantity >= item.quantity;
            }

            validatedItems.push({
                productId: product.id,
                variantId: item.variantId || null,
                title: product.title,
                price,
                quantity: item.quantity,
                imageUrl: product.featuredImage,
                inStock,
                lineTotal: price * item.quantity
            });
        }

        let subtotal = validatedItems.reduce((sum, i) => sum + i.lineTotal, 0);
        let discount = null;

        // Coupon validation
        if (couponCode) {
            try {
                const coupon = await prisma.coupon.findFirst({
                    where: {
                        storeId: req.storeId,
                        code: couponCode.toUpperCase(),
                        isActive: true
                    }
                });

                if (!coupon) {
                    discount = { valid: false, error: 'Invalid coupon code' };
                } else {
                    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                        discount = { valid: false, error: 'Coupon has expired' };
                    } else if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                        discount = { valid: false, error: 'Coupon usage limit reached' };
                    } else if (coupon.minimumSpend && subtotal < parseFloat(coupon.minimumSpend)) {
                        discount = { valid: false, error: `Minimum spend is $${coupon.minimumSpend}` };
                    } else if (coupon.maximumSpend && subtotal > parseFloat(coupon.maximumSpend)) {
                        discount = { valid: false, error: `Maximum spend is $${coupon.maximumSpend}` };
                    } else {
                        let discountAmount = 0;
                        const restrictedProductIds = Array.isArray(coupon.productIds) ? coupon.productIds : [];

                        if (coupon.discountType === 'percentage') {
                            if (restrictedProductIds.length > 0) {
                                // Apply percentage only to restricted products
                                discountAmount = validatedItems.reduce((sum, item) => {
                                    if (restrictedProductIds.includes(item.productId)) {
                                        return sum + (item.lineTotal * (parseFloat(coupon.amount) / 100));
                                    }
                                    return sum;
                                }, 0);
                            } else {
                                // Apply to whole subtotal
                                discountAmount = subtotal * (parseFloat(coupon.amount) / 100);
                            }
                        } else if (coupon.discountType === 'fixed_product') {
                            // Apply fixed discount per quantity of specific products
                            discountAmount = validatedItems.reduce((sum, item) => {
                                if (restrictedProductIds.includes(item.productId)) {
                                    return sum + (Math.min(parseFloat(coupon.amount), item.price) * item.quantity);
                                }
                                return sum;
                            }, 0);
                        } else {
                            // fixed_cart
                            discountAmount = Math.min(parseFloat(coupon.amount), subtotal);
                        }

                        if (restrictedProductIds.length > 0 && discountAmount === 0) {
                            discount = { valid: false, error: 'Coupon does not apply to any products in your cart' };
                        } else {
                            discount = {
                                valid: true,
                                code: coupon.code,
                                type: coupon.discountType,
                                amount: parseFloat(coupon.amount),
                                discountAmount: Math.round(discountAmount * 100) / 100,
                                freeShipping: coupon.freeShipping
                            };
                        }
                    }
                }
            } catch (e) {
                discount = { valid: false, error: 'Could not validate coupon' };
            }
        }

        const discountedSubtotal = discount?.valid ? Math.max(0, subtotal - discount.discountAmount) : subtotal;

        // Shipping calculation
        let shipping = null;
        if (shippingAddress && shippingAddress.country) {
            const freeShipping = discount?.valid && discount.freeShipping;
            if (freeShipping) {
                shipping = { zone: null, method: { type: 'free_shipping', title: 'Free Shipping (coupon)' }, cost: 0 };
            } else {
                shipping = await calculateShipping(req.storeId, shippingAddress.country, shippingAddress.state, discountedSubtotal);
            }
        }

        // Tax calculation
        let tax = null;
        if (shippingAddress && shippingAddress.country) {
            tax = await calculateTax(req.storeId, shippingAddress.country, shippingAddress.state || '', shippingAddress.postcode || '', shippingAddress.city || '', {
                subtotal: discountedSubtotal,
                shippingCost: shipping?.cost || 0
            });
        }

        const shippingCost = shipping?.cost || 0;
        const taxAmount = tax?.totalTax || 0;
        const total = discountedSubtotal + shippingCost + taxAmount;

        res.json({
            items: validatedItems,
            errors,
            subtotal: Math.round(subtotal * 100) / 100,
            discount,
            shipping,
            tax,
            shippingCost: Math.round(shippingCost * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            total: Math.round(total * 100) / 100,
            currency: req.store?.defaultCurrency || 'USD',
            allInStock: validatedItems.every(i => i.inStock) && errors.length === 0
        });
    } catch (error) {
        next(error);
    }
};

// List categories for storefront
const getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            where: { storeId: req.storeId },
            include: {
                _count: { select: { products: true } },
                children: { select: { id: true, name: true, slug: true } }
            },
            orderBy: { menuOrder: 'asc' }
        });

        res.json({
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                imageUrl: c.imageUrl,
                parentId: c.parentId,
                productCount: c._count.products,
                children: c.children
            }))
        });
    } catch (error) {
        next(error);
    }
};

// Helper: format product for public API
function formatProduct(p, full = false) {
    const now = new Date();
    const saleActive = p.salePrice &&
        (!p.salePriceFrom || new Date(p.salePriceFrom) <= now) &&
        (!p.salePriceTo || new Date(p.salePriceTo) >= now);

    const reviewRatings = p.reviews?.map(r => r.rating) || [];
    const avgRating = reviewRatings.length > 0
        ? Math.round((reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length) * 10) / 10
        : null;

    const result = {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: full ? p.description : (p.shortDescription || p.description?.substring(0, 200)),
        price: parseFloat(p.basePrice),
        salePrice: saleActive ? parseFloat(p.salePrice) : null,
        onSale: saleActive,
        imageUrl: p.featuredImage,
        images: p.images?.map(img => ({ url: img.url, alt: img.alt })) || [],
        galleryImages: p.galleryImages || [],
        categories: p.productCategories?.map(pc => pc.category) || [],
        tags: p.productTags?.map(pt => pt.tag) || [],
        sku: p.sku,
        stockStatus: p.stockStatus,
        inStock: p.stockStatus !== 'outofstock',
        isFeatured: p.isFeatured,
        rating: avgRating,
        reviewCount: reviewRatings.length,
        variants: p.variants?.map(v => ({
            id: v.id,
            sku: v.sku,
            price: parseFloat(v.price),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            attributes: v.attributes,
            isActive: v.isActive,
            stockStatus: v.stockStatus,
            manageStock: v.manageStock,
            inStock: v.stockStatus !== 'outofstock',
            stockQuantity: v.manageStock ? v.stockQuantity : null,
            imageUrl: v.imageUrl
        })) || []
    };

    // Full product details (single product page)
    if (full) {
        result.shortDescription = p.shortDescription;
        result.weight = p.weight ? parseFloat(p.weight) : null;
        result.dimensions = (p.length || p.width || p.height) ? {
            length: p.length ? parseFloat(p.length) : null,
            width: p.width ? parseFloat(p.width) : null,
            height: p.height ? parseFloat(p.height) : null
        } : null;
        result.purchaseNote = p.purchaseNote;
        result.externalUrl = p.externalUrl;
        result.buttonText = p.buttonText;
        result.seoTitle = p.seoTitle;
        result.seoDescription = p.seoDescription;
        result.reviews = p.reviews?.map(r => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            content: r.content,
            author: r.authorName,
            date: r.createdAt
        })) || [];
    }

    return result;
}

// Helper: get active price considering sale schedule
function getActivePrice(product) {
    const now = new Date();
    const saleActive = product.salePrice &&
        (!product.salePriceFrom || new Date(product.salePriceFrom) <= now) &&
        (!product.salePriceTo || new Date(product.salePriceTo) >= now);

    return saleActive ? parseFloat(product.salePrice) : parseFloat(product.basePrice);
}
// Quick search suggestions (lightweight)
const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ results: [] });

        const products = await prisma.product.findMany({
            where: {
                storeId: req.storeId,
                isPublished: true,
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { sku: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                title: true,
                slug: true,
                featuredImage: true,
                basePrice: true,
                salePrice: true,
                salePriceFrom: true,
                salePriceTo: true,
                stockStatus: true
            },
            take: 8,
            orderBy: { title: 'asc' }
        });

        const now = new Date();
        const results = products.map(p => {
            const saleActive = p.salePrice &&
                (!p.salePriceFrom || new Date(p.salePriceFrom) <= now) &&
                (!p.salePriceTo || new Date(p.salePriceTo) >= now);
            return {
                id: p.id,
                title: p.title,
                slug: p.slug,
                imageUrl: p.featuredImage,
                price: parseFloat(p.basePrice),
                salePrice: saleActive ? parseFloat(p.salePrice) : null,
                inStock: p.stockStatus !== 'outofstock'
            };
        });

        res.json({ results, query: q });
    } catch (error) {
        next(error);
    }
};

const getStorePublicInfo = async (req, res, next) => {
    try {
        const store = await prisma.store.findUnique({
            where: { id: req.storeId },
            select: {
                id: true,
                name: true,
                defaultCurrency: true,
                stripePublicKey: true
            }
        });

        if (stripeGateway && stripeGateway.config) {
            if (stripeGateway.config.testMode) {
                store.stripePublicKey = stripeGateway.config.testPublicKey || stripeGateway.config.publicKey;
            } else {
                store.stripePublicKey = stripeGateway.config.publicKey;
            }
        }

        res.json(store);
    } catch (error) {
        next(error);
    }
};

module.exports = { getProducts, getProductBySlug, validateCart, getCategories, searchProducts, getStorePublicInfo };
