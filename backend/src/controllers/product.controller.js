const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');

// Slugify helper
const slugify = (text) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── LIST PRODUCTS ───────────────────────────────────

exports.listProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { search, category, tag, status, type, featured } = req.query;

        const where = { storeId: req.storeId };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status === 'published') where.isPublished = true;
        if (status === 'draft') where.isPublished = false;
        if (type) where.productType = type;
        if (featured === 'true') where.isFeatured = true;

        if (category) {
            where.productCategories = { some: { categoryId: category } };
        }
        if (tag) {
            where.productTags = { some: { tagId: tag } };
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ menuOrder: 'asc' }, { createdAt: 'desc' }],
                include: {
                    variants: true,
                    productCategories: { include: { category: true } },
                    productTags: { include: { tag: true } },
                    images: { orderBy: { position: 'asc' } },
                    _count: { select: { reviews: true, orderItems: true } }
                }
            }),
            prisma.product.count({ where })
        ]);

        res.json({
            products: products.map(p => ({
                ...p,
                imageUrl: p.featuredImage || (p.images && p.images[0] ? p.images[0].url : null)
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('List products error:', error);
        res.status(500).json({ error: 'Failed to list products' });
    }
};

// ─── GET SINGLE PRODUCT ──────────────────────────────

exports.getProduct = async (req, res) => {
    try {
        const product = await prisma.product.findFirst({
            where: { id: req.params.id, storeId: req.storeId },
            include: {
                variants: { orderBy: { menuOrder: 'asc' } },
                productCategories: { include: { category: true } },
                productTags: { include: { tag: true } },
                images: { orderBy: { position: 'asc' } },
                reviews: {
                    where: { isApproved: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                _count: { select: { reviews: true, orderItems: true } }
            }
        });

        if (!product) return res.status(404).json({ error: 'Product not found' });

        product.imageUrl = product.featuredImage || (product.images && product.images[0] ? product.images[0].url : null);

        res.json({ product });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
};

// ─── CREATE PRODUCT ──────────────────────────────────

exports.createProduct = async (req, res) => {
    try {
        const {
            // General
            title, description, shortDescription, productType,
            basePrice, salePrice, salePriceFrom, salePriceTo, costOfGoods,
            // Inventory
            sku, barcode, manageStock, stockQuantity, stockStatus,
            backordersAllowed, lowStockThreshold, soldIndividually,
            // Shipping
            weight, length, width, height, shippingClass,
            // Tax
            taxStatus, taxClass,
            // Images
            featuredImage, galleryImages,
            // SEO
            seoTitle, seoDescription,
            // Advanced
            purchaseNote, menuOrder, enableReviews,
            // External
            externalUrl, buttonText,
            // Status
            isPublished, isFeatured, visibility,
            // Links
            upsellIds, crossSellIds,
            // Relations
            categoryIds, tagIds,
            // Variants
            variants,
            // Meta
            metadata
        } = req.body;

        if (!title || basePrice === undefined) {
            return res.status(400).json({ error: 'Title and price are required' });
        }

        // Generate unique slug
        let slug = slugify(title);
        const existingSlug = await prisma.product.findFirst({
            where: { storeId: req.storeId, slug }
        });
        if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

        // Build product data
        const productData = {
            storeId: req.storeId,
            productType: productType || 'simple',
            title, slug,
            description: description || null,
            shortDescription: shortDescription || null,
            basePrice: parseFloat(basePrice),
            salePrice: salePrice ? parseFloat(salePrice) : null,
            salePriceFrom: salePriceFrom ? new Date(salePriceFrom) : null,
            salePriceTo: salePriceTo ? new Date(salePriceTo) : null,
            costOfGoods: costOfGoods ? parseFloat(costOfGoods) : null,
            compareAtPrice: salePrice ? parseFloat(basePrice) : null,
            sku: sku || null,
            barcode: barcode || null,
            manageStock: manageStock || false,
            stockQuantity: parseInt(stockQuantity) || 0,
            stockStatus: stockStatus || 'instock',
            backordersAllowed: backordersAllowed || 'no',
            lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : null,
            soldIndividually: soldIndividually || false,
            weight: weight ? parseFloat(weight) : null,
            length: length ? parseFloat(length) : null,
            width: width ? parseFloat(width) : null,
            height: height ? parseFloat(height) : null,
            shippingClass: shippingClass || null,
            taxStatus: taxStatus || 'taxable',
            taxClass: taxClass || null,
            featuredImage: featuredImage || null,
            galleryImages: galleryImages || [],
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            purchaseNote: purchaseNote || null,
            menuOrder: parseInt(menuOrder) || 0,
            enableReviews: enableReviews !== false,
            externalUrl: externalUrl || null,
            buttonText: buttonText || null,
            isPublished: isPublished !== false,
            isFeatured: isFeatured || false,
            visibility: visibility || 'visible',
            upsellIds: upsellIds || [],
            crossSellIds: crossSellIds || [],
            metadata: metadata || {}
        };

        // Create with variants if provided
        if (variants && variants.length > 0) {
            productData.variants = {
                create: variants.map((v, i) => ({
                    sku: v.sku || null,
                    barcode: v.barcode || null,
                    price: parseFloat(v.price),
                    salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
                    costOfGoods: v.costOfGoods ? parseFloat(v.costOfGoods) : null,
                    stockQuantity: parseInt(v.stockQuantity) || 0,
                    manageStock: v.manageStock || false,
                    stockStatus: v.stockStatus || 'instock',
                    weight: v.weight ? parseFloat(v.weight) : null,
                    length: v.length ? parseFloat(v.length) : null,
                    width: v.width ? parseFloat(v.width) : null,
                    height: v.height ? parseFloat(v.height) : null,
                    imageUrl: v.imageUrl || null,
                    attributes: v.attributes || {},
                    menuOrder: i
                }))
            };
        }

        const product = await prisma.product.create({
            data: productData,
            include: { variants: true }
        });

        // Add categories
        if (categoryIds && categoryIds.length > 0) {
            await prisma.productCategory.createMany({
                data: categoryIds.map(cid => ({
                    productId: product.id,
                    categoryId: cid
                })),
                skipDuplicates: true
            });
        }

        // Add tags
        if (tagIds && tagIds.length > 0) {
            await prisma.productTag.createMany({
                data: tagIds.map(tid => ({
                    productId: product.id,
                    tagId: tid
                })),
                skipDuplicates: true
            });
        }

        // Fetch complete product
        const fullProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
                variants: true,
                productCategories: { include: { category: true } },
                productTags: { include: { tag: true } },
                images: true
            }
        });

        res.status(201).json({ product: fullProduct });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
};

// ─── UPDATE PRODUCT ──────────────────────────────────

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.product.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Product not found' });

        const {
            title, description, shortDescription, productType,
            basePrice, salePrice, salePriceFrom, salePriceTo, costOfGoods,
            sku, barcode, manageStock, stockQuantity, stockStatus,
            backordersAllowed, lowStockThreshold, soldIndividually,
            weight, length, width, height, shippingClass,
            taxStatus, taxClass,
            featuredImage, galleryImages,
            seoTitle, seoDescription,
            purchaseNote, menuOrder, enableReviews,
            externalUrl, buttonText,
            isPublished, isFeatured, visibility,
            upsellIds, crossSellIds,
            categoryIds, tagIds,
            variants,
            metadata
        } = req.body;

        const data = {};

        // Only update provided fields
        if (title !== undefined) {
            data.title = title;
            if (title !== existing.title) {
                let slug = slugify(title);
                const slugExists = await prisma.product.findFirst({
                    where: { storeId: req.storeId, slug, NOT: { id } }
                });
                if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
                data.slug = slug;
            }
        }
        if (productType !== undefined) data.productType = productType;
        if (description !== undefined) data.description = description;
        if (shortDescription !== undefined) data.shortDescription = shortDescription;
        if (basePrice !== undefined) data.basePrice = parseFloat(basePrice);
        if (salePrice !== undefined) data.salePrice = salePrice ? parseFloat(salePrice) : null;
        if (salePriceFrom !== undefined) data.salePriceFrom = salePriceFrom ? new Date(salePriceFrom) : null;
        if (salePriceTo !== undefined) data.salePriceTo = salePriceTo ? new Date(salePriceTo) : null;
        if (costOfGoods !== undefined) data.costOfGoods = costOfGoods ? parseFloat(costOfGoods) : null;
        if (sku !== undefined) data.sku = sku;
        if (barcode !== undefined) data.barcode = barcode;
        if (manageStock !== undefined) data.manageStock = manageStock;
        if (stockQuantity !== undefined) data.stockQuantity = parseInt(stockQuantity);
        if (stockStatus !== undefined) data.stockStatus = stockStatus;
        if (backordersAllowed !== undefined) data.backordersAllowed = backordersAllowed;
        if (lowStockThreshold !== undefined) data.lowStockThreshold = lowStockThreshold ? parseInt(lowStockThreshold) : null;
        if (soldIndividually !== undefined) data.soldIndividually = soldIndividually;
        if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
        if (length !== undefined) data.length = length ? parseFloat(length) : null;
        if (width !== undefined) data.width = width ? parseFloat(width) : null;
        if (height !== undefined) data.height = height ? parseFloat(height) : null;
        if (shippingClass !== undefined) data.shippingClass = shippingClass;
        if (taxStatus !== undefined) data.taxStatus = taxStatus;
        if (taxClass !== undefined) data.taxClass = taxClass;
        if (featuredImage !== undefined) data.featuredImage = featuredImage;
        if (galleryImages !== undefined) data.galleryImages = galleryImages;
        if (seoTitle !== undefined) data.seoTitle = seoTitle;
        if (seoDescription !== undefined) data.seoDescription = seoDescription;
        if (purchaseNote !== undefined) data.purchaseNote = purchaseNote;
        if (menuOrder !== undefined) data.menuOrder = parseInt(menuOrder);
        if (enableReviews !== undefined) data.enableReviews = enableReviews;
        if (externalUrl !== undefined) data.externalUrl = externalUrl;
        if (buttonText !== undefined) data.buttonText = buttonText;
        if (isPublished !== undefined) data.isPublished = isPublished;
        if (isFeatured !== undefined) data.isFeatured = isFeatured;
        if (visibility !== undefined) data.visibility = visibility;
        if (upsellIds !== undefined) data.upsellIds = upsellIds;
        if (crossSellIds !== undefined) data.crossSellIds = crossSellIds;
        if (metadata !== undefined) data.metadata = metadata;

        await prisma.product.update({ where: { id }, data });

        // Update categories if provided
        if (categoryIds !== undefined) {
            await prisma.productCategory.deleteMany({ where: { productId: id } });
            if (categoryIds.length > 0) {
                await prisma.productCategory.createMany({
                    data: categoryIds.map(cid => ({ productId: id, categoryId: cid })),
                    skipDuplicates: true
                });
            }
        }

        // Update tags if provided
        if (tagIds !== undefined) {
            await prisma.productTag.deleteMany({ where: { productId: id } });
            if (tagIds.length > 0) {
                await prisma.productTag.createMany({
                    data: tagIds.map(tid => ({ productId: id, tagId: tid })),
                    skipDuplicates: true
                });
            }
        }

        // Update variants if provided
        if (variants !== undefined) {
            await prisma.variant.deleteMany({ where: { productId: id } });
            if (variants.length > 0) {
                await prisma.variant.createMany({
                    data: variants.map((v, i) => ({
                        productId: id,
                        sku: v.sku || null,
                        barcode: v.barcode || null,
                        price: parseFloat(v.price),
                        salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
                        costOfGoods: v.costOfGoods ? parseFloat(v.costOfGoods) : null,
                        stockQuantity: parseInt(v.stockQuantity) || 0,
                        manageStock: v.manageStock || false,
                        stockStatus: v.stockStatus || 'instock',
                        weight: v.weight ? parseFloat(v.weight) : null,
                        length: v.length ? parseFloat(v.length) : null,
                        width: v.width ? parseFloat(v.width) : null,
                        height: v.height ? parseFloat(v.height) : null,
                        imageUrl: v.imageUrl || null,
                        attributes: v.attributes || {},
                        menuOrder: i
                    }))
                });
            }
        }

        // Fetch complete updated product
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                variants: { orderBy: { menuOrder: 'asc' } },
                productCategories: { include: { category: true } },
                productTags: { include: { tag: true } },
                images: { orderBy: { position: 'asc' } }
            }
        });

        res.json({ product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
};

// ─── DELETE PRODUCT ──────────────────────────────────

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.product.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Product not found' });

        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

// ─── DUPLICATE PRODUCT ───────────────────────────────

exports.duplicateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const original = await prisma.product.findFirst({
            where: { id, storeId: req.storeId },
            include: {
                variants: true,
                productCategories: true,
                productTags: true
            }
        });
        if (!original) return res.status(404).json({ error: 'Product not found' });

        const { id: _, storeId, createdAt, updatedAt, variants, productCategories, productTags, ...productData } = original;

        let slug = `${original.slug}-copy`;
        const slugExists = await prisma.product.findFirst({
            where: { storeId: req.storeId, slug }
        });
        if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

        const newProduct = await prisma.product.create({
            data: {
                ...productData,
                storeId: req.storeId,
                title: `${original.title} (Copy)`,
                slug,
                isPublished: false,
                variants: {
                    create: variants.map(({ id, productId, createdAt, updatedAt, ...v }) => v)
                }
            },
            include: { variants: true }
        });

        // Copy categories and tags
        if (productCategories.length > 0) {
            await prisma.productCategory.createMany({
                data: productCategories.map(pc => ({
                    productId: newProduct.id,
                    categoryId: pc.categoryId
                }))
            });
        }
        if (productTags.length > 0) {
            await prisma.productTag.createMany({
                data: productTags.map(pt => ({
                    productId: newProduct.id,
                    tagId: pt.tagId
                }))
            });
        }

        res.status(201).json({ product: newProduct });
    } catch (error) {
        console.error('Duplicate product error:', error);
        res.status(500).json({ error: 'Failed to duplicate product' });
    }
};

// ─── IMAGE UPLOAD ────────────────────────────────────

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ url: imageUrl, filename: req.file.filename });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

// ─── BULK ACTIONS ────────────────────────────────────

exports.bulkAction = async (req, res) => {
    try {
        const { action, productIds } = req.body;
        if (!action || !productIds || productIds.length === 0) {
            return res.status(400).json({ error: 'Action and product IDs required' });
        }

        const where = { id: { in: productIds }, storeId: req.storeId };

        switch (action) {
            case 'publish':
                await prisma.product.updateMany({ where, data: { isPublished: true } });
                break;
            case 'draft':
                await prisma.product.updateMany({ where, data: { isPublished: false } });
                break;
            case 'feature':
                await prisma.product.updateMany({ where, data: { isFeatured: true } });
                break;
            case 'unfeature':
                await prisma.product.updateMany({ where, data: { isFeatured: false } });
                break;
            case 'delete':
                await prisma.product.deleteMany({ where });
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ message: `Bulk ${action} completed`, count: productIds.length });
    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ error: 'Failed to perform bulk action' });
    }
};
