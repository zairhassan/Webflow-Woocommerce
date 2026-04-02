const prisma = require('../lib/prisma');

// ─── LIST COUPONS ────────────────────────────────────

exports.listCoupons = async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            where: { storeId: req.storeId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { orders: true } } }
        });
        res.json({ coupons });
    } catch (error) {
        console.error('List coupons error:', error);
        res.status(500).json({ error: 'Failed to list coupons' });
    }
};

// ─── GET COUPON ──────────────────────────────────────

exports.getCoupon = async (req, res) => {
    try {
        const coupon = await prisma.coupon.findFirst({
            where: { id: req.params.id, storeId: req.storeId },
            include: { _count: { select: { orders: true } } }
        });
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        res.json({ coupon });
    } catch (error) {
        console.error('Get coupon error:', error);
        res.status(500).json({ error: 'Failed to get coupon' });
    }
};

// ─── CREATE COUPON ───────────────────────────────────

exports.createCoupon = async (req, res) => {
    try {
        const {
            code, description, discountType, amount,
            freeShipping, expiryDate, minimumSpend, maximumSpend,
            individualUseOnly, excludeSaleItems,
            usageLimit, usageLimitPerUser,
            productIds, excludeProductIds,
            categoryIds, excludeCategoryIds
        } = req.body;

        if (!code || !amount) {
            return res.status(400).json({ error: 'Code and amount are required' });
        }

        // Check for duplicate code
        const existing = await prisma.coupon.findFirst({
            where: { storeId: req.storeId, code: code.toUpperCase() }
        });
        if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

        const coupon = await prisma.coupon.create({
            data: {
                storeId: req.storeId,
                code: code.toUpperCase(),
                description: description || null,
                discountType: discountType || 'percentage',
                amount: parseFloat(amount),
                freeShipping: freeShipping || false,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                minimumSpend: minimumSpend ? parseFloat(minimumSpend) : null,
                maximumSpend: maximumSpend ? parseFloat(maximumSpend) : null,
                individualUseOnly: individualUseOnly || false,
                excludeSaleItems: excludeSaleItems || false,
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
                usageLimitPerUser: usageLimitPerUser ? parseInt(usageLimitPerUser) : null,
                productIds: productIds || [],
                excludeProductIds: excludeProductIds || [],
                categoryIds: categoryIds || [],
                excludeCategoryIds: excludeCategoryIds || []
            }
        });

        res.status(201).json({ coupon });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
};

// ─── UPDATE COUPON ───────────────────────────────────

exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.coupon.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Coupon not found' });

        const data = {};
        const fields = [
            'description', 'discountType', 'freeShipping',
            'individualUseOnly', 'excludeSaleItems', 'isActive',
            'productIds', 'excludeProductIds', 'categoryIds', 'excludeCategoryIds'
        ];

        fields.forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

        if (req.body.code !== undefined) data.code = req.body.code.toUpperCase();
        if (req.body.amount !== undefined) data.amount = parseFloat(req.body.amount);
        if (req.body.expiryDate !== undefined) data.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;
        if (req.body.minimumSpend !== undefined) data.minimumSpend = req.body.minimumSpend ? parseFloat(req.body.minimumSpend) : null;
        if (req.body.maximumSpend !== undefined) data.maximumSpend = req.body.maximumSpend ? parseFloat(req.body.maximumSpend) : null;
        if (req.body.usageLimit !== undefined) data.usageLimit = req.body.usageLimit ? parseInt(req.body.usageLimit) : null;
        if (req.body.usageLimitPerUser !== undefined) data.usageLimitPerUser = req.body.usageLimitPerUser ? parseInt(req.body.usageLimitPerUser) : null;

        const coupon = await prisma.coupon.update({ where: { id }, data });
        res.json({ coupon });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: 'Failed to update coupon' });
    }
};

// ─── DELETE COUPON ───────────────────────────────────

exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.coupon.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Coupon not found' });

        await prisma.coupon.delete({ where: { id } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
};

// ─── VALIDATE & APPLY COUPON (Public) ────────────────

exports.validateCoupon = async (req, res) => {
    try {
        const { code, cartTotal, cartItems, customerEmail } = req.body;
        if (!code) return res.status(400).json({ error: 'Coupon code is required' });

        const coupon = await prisma.coupon.findFirst({
            where: { storeId: req.storeId, code: code.toUpperCase(), isActive: true }
        });

        if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });

        // Check expiry
        if (coupon.expiryDate && new Date() > coupon.expiryDate) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        // Check per-user limit
        if (coupon.usageLimitPerUser && customerEmail) {
            const userUsage = await prisma.order.count({
                where: { storeId: req.storeId, couponCode: code.toUpperCase(), customerEmail, status: { not: 'cancelled' } }
            });
            if (userUsage >= coupon.usageLimitPerUser) {
                return res.status(400).json({ error: 'You have already used this coupon the maximum number of times' });
            }
        }

        // Check minimum spend
        const total = parseFloat(cartTotal) || 0;
        if (coupon.minimumSpend && total < parseFloat(coupon.minimumSpend)) {
            return res.status(400).json({ error: `Minimum spend of $${coupon.minimumSpend} required` });
        }

        // Check maximum spend
        if (coupon.maximumSpend && total > parseFloat(coupon.maximumSpend)) {
            return res.status(400).json({ error: `Maximum spend of $${coupon.maximumSpend} exceeded` });
        }

        // Calculate discount
        let discount = 0;
        const amount = parseFloat(coupon.amount);

        switch (coupon.discountType) {
            case 'percentage':
                discount = total * (amount / 100);
                break;
            case 'fixed_cart':
                discount = Math.min(amount, total);
                break;
            case 'fixed_product':
                // Apply per-product discount to eligible items
                if (cartItems && cartItems.length > 0) {
                    discount = cartItems.reduce((sum, item) => {
                        return sum + Math.min(amount, parseFloat(item.price || 0)) * (item.quantity || 1);
                    }, 0);
                } else {
                    discount = Math.min(amount, total);
                }
                break;
            default:
                discount = 0;
        }

        discount = Math.round(discount * 100) / 100; // Round to 2 decimals

        res.json({
            valid: true,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                amount: coupon.amount,
                freeShipping: coupon.freeShipping,
                description: coupon.description
            },
            discount,
            newTotal: Math.max(0, total - discount)
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }
};
