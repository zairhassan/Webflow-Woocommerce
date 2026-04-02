const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Create checkout session — supports coupons + customer accounts
const createCheckoutSession = async (req, res, next) => {
    try {
        const { items, customerEmail, successUrl, cancelUrl, couponCode, customerToken } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        let stripeSecretKey = req.store.stripeSecretKey;

        // Try to get from PaymentGateway config (newer system)
        const stripeGateway = await prisma.paymentGateway.findFirst({
            where: { storeId: req.storeId, provider: 'stripe', isActive: true }
        });

        if (stripeGateway && stripeGateway.config) {
            stripeSecretKey = stripeGateway.config.testMode 
                ? (stripeGateway.config.testSecretKey || stripeGateway.config.secretKey)
                : stripeGateway.config.secretKey;
        }

        if (!stripeSecretKey) {
            return res.status(400).json({ error: 'Store has not configured Stripe payments' });
        }

        const stripe = new Stripe(stripeSecretKey);

        // Resolve customer from token
        let customerId = null;
        let resolvedEmail = customerEmail;
        if (customerToken) {
            try {
                const decoded = jwt.verify(customerToken, process.env.JWT_SECRET);
                if (decoded.type === 'customer') {
                    customerId = decoded.customerId;
                    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
                    if (customer) resolvedEmail = customer.email;
                }
            } catch (e) { /* invalid token, proceed without customer */ }
        }

        // Validate products
        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, storeId: req.storeId, isPublished: true },
            include: { variants: true }
        });

        if (products.length !== productIds.length) {
            return res.status(400).json({ error: 'One or more products not found' });
        }

        // Build line items
        const lineItems = [];
        const orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) continue;

            let price = getActivePrice(product);
            let variantId = null;

            if (item.variantId) {
                const variant = product.variants.find(v => v.id === item.variantId);
                if (!variant) return res.status(400).json({ error: `Variant not found for ${product.title}` });
                price = variant.salePrice ? parseFloat(variant.salePrice) : parseFloat(variant.price);
                variantId = variant.id;
                if (variant.manageStock && variant.stockQuantity < item.quantity) {
                    return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
                }
            } else if (product.manageStock && product.stockQuantity < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
            }

            const itemTotal = price * item.quantity;
            subtotal += itemTotal;

            lineItems.push({
                price_data: {
                    currency: req.store.defaultCurrency.toLowerCase(),
                    product_data: {
                        name: product.title,
                        description: product.description ? product.description.substring(0, 200) : undefined,
                        images: product.featuredImage ? [product.featuredImage] : undefined
                    },
                    unit_amount: Math.round(price * 100)
                },
                quantity: item.quantity
            });

            orderItems.push({
                productId: product.id,
                variantId,
                productTitle: product.title,
                sku: product.sku,
                unitPrice: price,
                quantity: item.quantity,
                totalPrice: itemTotal
            });
        }

        // Handle coupon
        let couponId = null;
        let discountAmount = 0;
        let stripeCouponId = null;

        if (couponCode) {
            const coupon = await prisma.coupon.findFirst({
                where: { storeId: req.storeId, code: couponCode.toUpperCase(), isActive: true }
            });

            if (coupon) {
                const valid = (!coupon.expiryDate || new Date(coupon.expiryDate) > new Date()) &&
                    (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) &&
                    (!coupon.minimumSpend || subtotal >= parseFloat(coupon.minimumSpend));

                if (valid) {
                    couponId = coupon.id;
                    if (coupon.discountType === 'percentage') {
                        discountAmount = subtotal * (parseFloat(coupon.amount) / 100);
                    } else {
                        discountAmount = Math.min(parseFloat(coupon.amount), subtotal);
                    }

                    // Create Stripe coupon
                    const stripeCoupon = await stripe.coupons.create(
                        coupon.discountType === 'percentage'
                            ? { percent_off: parseFloat(coupon.amount), duration: 'once' }
                            : { amount_off: Math.round(discountAmount * 100), currency: req.store.defaultCurrency.toLowerCase(), duration: 'once' }
                    );
                    stripeCouponId = stripeCoupon.id;

                    // Increment usage
                    await prisma.coupon.update({
                        where: { id: coupon.id },
                        data: { usageCount: { increment: 1 } }
                    });
                }
            }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        // Create Stripe checkout
        const sessionConfig = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl || `${process.env.SUCCESS_URL || 'https://example.com/success'}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || process.env.CANCEL_URL || 'https://example.com/cancel',
            customer_email: resolvedEmail || undefined,
            metadata: {
                storeId: req.storeId,
                customerId: customerId || '',
                couponId: couponId || '',
                orderItems: JSON.stringify(orderItems.map(i => ({
                    pid: i.productId, vid: i.variantId, t: i.productTitle, p: i.unitPrice, q: i.quantity
                })))
            }
        };

        // Apply Stripe coupon discount
        if (stripeCouponId) {
            sessionConfig.discounts = [{ coupon: stripeCouponId }];
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        // Create pending order
        const order = await prisma.order.create({
            data: {
                storeId: req.storeId,
                customerId: customerId || undefined,
                customerEmail: resolvedEmail || 'unknown@checkout.com',
                subtotal,
                discountAmount,
                totalAmount,
                currency: req.store.defaultCurrency,
                status: 'pending',
                stripeSessionId: session.id,
                couponId: couponId || undefined,
                couponCode: couponCode ? couponCode.toUpperCase() : undefined,
                items: { create: orderItems }
            }
        });

        res.json({
            sessionId: session.id,
            url: session.url,
            orderId: order.id
        });
    } catch (error) {
        console.error('Checkout error:', error);
        next(error);
    }
};

// Create Payment Intent for Stripe Elements (On-site iframe)
const createPaymentIntent = async (req, res, next) => {
    try {
        const { items, customerEmail, couponCode, customerToken, shippingAddress, paymentMethod } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ error: 'Items required' });

        // Calculate Totals
        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, storeId: req.storeId },
            include: { variants: true }
        });

        let subtotal = 0;
        const orderItems = [];

        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;
            const price = getActivePrice(product);
            const itemTotal = price * item.quantity;
            subtotal += itemTotal;
            orderItems.push({
                productId: product.id,
                variantId: item.variantId || null,
                productTitle: product.title,
                unitPrice: price,
                quantity: item.quantity,
                totalPrice: itemTotal
            });
        });

        // Resolve customer from token
        let customerId = null;
        if (customerToken) {
            try {
                const decoded = jwt.verify(customerToken, process.env.JWT_SECRET);
                if (decoded.type === 'customer') {
                    customerId = decoded.customerId;
                }
            } catch (e) { /* invalid token */ }
        }

        // Account Creation Logic
        if (!customerId && req.body.createAccount && req.body.password && customerEmail) {
            const existingCustomer = await prisma.customer.findUnique({
                where: {
                    storeId_email: {
                        storeId: req.storeId,
                        email: customerEmail
                    }
                }
            });
            if (!existingCustomer) {
                const passwordHash = await bcrypt.hash(req.body.password, 12);
                const newCustomer = await prisma.customer.create({
                    data: {
                        storeId: req.storeId,
                        email: customerEmail,
                        passwordHash,
                        firstName: shippingAddress?.name?.split(' ')[0] || '',
                        lastName: shippingAddress?.name?.split(' ').slice(1).join(' ') || ''
                    }
                });
                customerId = newCustomer.id;
            } else {
                customerId = existingCustomer.id;
            }
        }

        // Discount logic
        let discountAmount = 0;
        let couponId = null;

        if (couponCode) {
            const coupon = await prisma.coupon.findFirst({
                where: { storeId: req.storeId, code: couponCode.toUpperCase(), isActive: true }
            });

            if (coupon) {
                const isValid = (!coupon.expiryDate || new Date(coupon.expiryDate) > new Date()) &&
                    (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) &&
                    (!coupon.minimumSpend || subtotal >= parseFloat(coupon.minimumSpend)) &&
                    (!coupon.maximumSpend || subtotal <= parseFloat(coupon.maximumSpend));

                if (isValid) {
                    couponId = coupon.id;
                    const restrictedProductIds = Array.isArray(coupon.productIds) ? coupon.productIds : [];

                    if (coupon.discountType === 'percentage') {
                        if (restrictedProductIds.length > 0) {
                            discountAmount = orderItems.reduce((sum, item) => {
                                if (restrictedProductIds.includes(item.productId)) {
                                    return sum + (item.totalPrice * (parseFloat(coupon.amount) / 100));
                                }
                                return sum;
                            }, 0);
                        } else {
                            discountAmount = subtotal * (parseFloat(coupon.amount) / 100);
                        }
                    } else if (coupon.discountType === 'fixed_product') {
                        discountAmount = orderItems.reduce((sum, item) => {
                            if (restrictedProductIds.includes(item.productId)) {
                                return sum + (Math.min(parseFloat(coupon.amount), item.unitPrice) * item.quantity);
                            }
                            return sum;
                        }, 0);
                    } else {
                        discountAmount = Math.min(parseFloat(coupon.amount), subtotal);
                    }

                    // Increment usage
                    if (discountAmount > 0) {
                        await prisma.coupon.update({
                            where: { id: coupon.id },
                            data: { usageCount: { increment: 1 } }
                        });
                    }
                }
            }
        }

        const totalAmount = Math.max(0, subtotal - discountAmount);

        // 1. CASH ON DELIVERY / MANUAL
        if (paymentMethod === 'cod') {
            const order = await prisma.order.create({
                data: {
                    storeId: req.storeId,
                    customerId: customerId || undefined,
                    customerEmail: customerEmail || 'guest@example.com',
                    subtotal,
                    discountAmount,
                    totalAmount,
                    currency: req.store.defaultCurrency,
                    status: 'processing', // COD orders start as processing
                    paymentMethod: 'cod',
                    couponId: couponId || undefined,
                    couponCode: couponId ? couponCode.toUpperCase() : undefined,
                    shippingAddress: shippingAddress || {},
                    items: { create: orderItems }
                }
            });
            return res.json({ success: true, orderId: order.id, method: 'cod' });
        }

        // 2. STRIPE ELEMENTS
        let stripeSecretKey = req.store.stripeSecretKey;
        const stripeGateway = await prisma.paymentGateway.findFirst({
            where: { storeId: req.storeId, provider: 'stripe', isActive: true }
        });

        if (stripeGateway && stripeGateway.config) {
            stripeSecretKey = stripeGateway.config.testMode 
                ? (stripeGateway.config.testSecretKey || stripeGateway.config.secretKey)
                : stripeGateway.config.secretKey;
        }

        if (!stripeSecretKey) return res.status(400).json({ error: 'Stripe not configured' });
        const stripe = new Stripe(stripeSecretKey);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: req.store.defaultCurrency.toLowerCase(),
            metadata: {
                storeId: req.storeId,
                customerEmail: customerEmail || '',
                items: JSON.stringify(items.slice(0, 5)) // Stripe metadata limit
            }
        });

        // Create pending order
        const order = await prisma.order.create({
            data: {
                storeId: req.storeId,
                customerId: customerId || undefined,
                customerEmail: customerEmail || 'guest@example.com',
                subtotal,
                discountAmount,
                totalAmount,
                currency: req.store.defaultCurrency,
                status: 'pending',
                paymentMethod: 'stripe_elements',
                stripePaymentIntent: paymentIntent.id,
                couponId: couponId || undefined,
                couponCode: couponId ? couponCode.toUpperCase() : undefined,
                shippingAddress: shippingAddress || {},
                items: { create: orderItems }
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            orderId: order.id,
            method: 'stripe'
        });

    } catch (error) {
        console.error('Payment Intent Error:', error);
        res.status(500).json({ error: error.message });
    }
};

function getActivePrice(product) {
    const now = new Date();
    const saleActive = product.salePrice &&
        (!product.salePriceFrom || new Date(product.salePriceFrom) <= now) &&
        (!product.salePriceTo || new Date(product.salePriceTo) >= now);
    return saleActive ? parseFloat(product.salePrice) : parseFloat(product.basePrice);
}

module.exports = { createCheckoutSession, createPaymentIntent };
