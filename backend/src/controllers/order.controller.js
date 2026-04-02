const prisma = require('../lib/prisma');

// List orders (admin)
const listOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = { storeId: req.storeId };
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { customerEmail: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: true,
                    customer: { select: { firstName: true, lastName: true, email: true } }
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.count({ where })
        ]);

        res.json({
            orders: orders.map(o => ({
                ...o,
                subtotal: parseFloat(o.subtotal),
                taxAmount: parseFloat(o.taxAmount),
                shippingAmount: parseFloat(o.shippingAmount),
                totalAmount: parseFloat(o.totalAmount),
                items: o.items.map(i => ({
                    ...i,
                    unitPrice: parseFloat(i.unitPrice)
                }))
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get single order
const getOrder = async (req, res, next) => {
    try {
        const order = await prisma.order.findFirst({
            where: { id: req.params.id, storeId: req.storeId },
            include: {
                items: true,
                customer: { select: { firstName: true, lastName: true, email: true } }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            order: {
                ...order,
                subtotal: parseFloat(order.subtotal),
                taxAmount: parseFloat(order.taxAmount),
                shippingAmount: parseFloat(order.shippingAmount),
                totalAmount: parseFloat(order.totalAmount),
                items: order.items.map(i => ({
                    ...i,
                    unitPrice: parseFloat(i.unitPrice)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update order status
const updateOrderStatus = async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        const existing = await prisma.order.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updateData = { status };
        if (notes !== undefined) updateData.notes = notes;

        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: updateData,
            include: { items: true }
        });

        res.json({
            message: 'Order status updated',
            order: {
                ...order,
                subtotal: parseFloat(order.subtotal),
                taxAmount: parseFloat(order.taxAmount),
                shippingAmount: parseFloat(order.shippingAmount),
                totalAmount: parseFloat(order.totalAmount),
                items: order.items.map(i => ({
                    ...i,
                    unitPrice: parseFloat(i.unitPrice)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Dashboard stats
const getStats = async (req, res, next) => {
    try {
        const [
            totalOrders,
            totalProducts,
            recentOrders,
            ordersByStatus
        ] = await Promise.all([
            prisma.order.count({ where: { storeId: req.storeId } }),
            prisma.product.count({ where: { storeId: req.storeId } }),
            prisma.order.findMany({
                where: { storeId: req.storeId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, customerEmail: true, totalAmount: true, status: true, createdAt: true }
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: { storeId: req.storeId },
                _count: { status: true },
                _sum: { totalAmount: true }
            })
        ]);

        // Calculate total revenue from paid/completed orders
        const revenueData = ordersByStatus.find(s => ['paid', 'processing', 'shipped', 'delivered'].includes(s.status));
        let totalRevenue = 0;
        ordersByStatus.forEach(s => {
            if (['paid', 'processing', 'shipped', 'delivered'].includes(s.status)) {
                totalRevenue += parseFloat(s._sum.totalAmount || 0);
            }
        });

        res.json({
            stats: {
                totalOrders,
                totalProducts,
                totalRevenue,
                ordersByStatus: ordersByStatus.map(s => ({
                    status: s.status,
                    count: s._count.status,
                    revenue: parseFloat(s._sum.totalAmount || 0)
                })),
                recentOrders: recentOrders.map(o => ({
                    ...o,
                    totalAmount: parseFloat(o.totalAmount)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { listOrders, getOrder, updateOrderStatus, getStats };
