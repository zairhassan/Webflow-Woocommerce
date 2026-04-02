const prisma = require('../lib/prisma');

// ─── Dashboard Overview ─────────────────────────────────
exports.getOverview = async (req, res) => {
    try {
        const storeId = req.storeId;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // All-time counts
        const [totalOrders, totalCustomers, totalProducts] = await Promise.all([
            prisma.order.count({ where: { storeId, status: { not: 'cancelled' } } }),
            prisma.customer.count({ where: { storeId } }),
            prisma.product.count({ where: { storeId, isPublished: true } })
        ]);

        // Revenue: this month vs last month
        const [thisMonthOrders, lastMonthOrders] = await Promise.all([
            prisma.order.findMany({
                where: { storeId, status: { notIn: ['cancelled', 'refunded'] }, createdAt: { gte: thisMonth, lte: thisMonthEnd } },
                select: { totalAmount: true }
            }),
            prisma.order.findMany({
                where: { storeId, status: { notIn: ['cancelled', 'refunded'] }, createdAt: { gte: lastMonth, lte: lastMonthEnd } },
                select: { totalAmount: true }
            })
        ]);

        const thisMonthRevenue = thisMonthOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
        const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
        const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : null;

        // Today's stats
        const todayOrders = await prisma.order.findMany({
            where: { storeId, createdAt: { gte: today }, status: { notIn: ['cancelled', 'refunded'] } },
            select: { totalAmount: true }
        });
        const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0);

        // Average order value
        const allPaidOrders = await prisma.order.findMany({
            where: { storeId, status: { notIn: ['cancelled', 'refunded', 'pending'] } },
            select: { totalAmount: true },
            take: 1000
        });
        const avgOrderValue = allPaidOrders.length > 0
            ? allPaidOrders.reduce((s, o) => s + parseFloat(o.totalAmount), 0) / allPaidOrders.length
            : 0;

        res.json({
            kpis: {
                totalRevenue: Math.round(thisMonthRevenue * 100) / 100,
                lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
                revenueGrowth: revenueGrowth ? parseFloat(revenueGrowth) : null,
                todayRevenue: Math.round(todayRevenue * 100) / 100,
                todayOrders: todayOrders.length,
                totalOrders,
                thisMonthOrders: thisMonthOrders.length,
                totalCustomers,
                totalProducts,
                avgOrderValue: Math.round(avgOrderValue * 100) / 100
            }
        });
    } catch (error) {
        console.error('getOverview error:', error);
        res.status(500).json({ error: 'Failed to get analytics overview' });
    }
};

// ─── Revenue Chart Data ─────────────────────────────────
exports.getRevenueChart = async (req, res) => {
    try {
        const storeId = req.storeId;
        const { period = '30d' } = req.query;

        let days = 30;
        if (period === '7d') days = 7;
        if (period === '90d') days = 90;
        if (period === '12m') days = 365;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const orders = await prisma.order.findMany({
            where: {
                storeId,
                createdAt: { gte: startDate },
                status: { notIn: ['cancelled', 'refunded'] }
            },
            select: { totalAmount: true, createdAt: true },
            orderBy: { createdAt: 'asc' }
        });

        // Group by day
        const dailyMap = {};
        for (let d = 0; d < days; d++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + d);
            const key = date.toISOString().split('T')[0];
            dailyMap[key] = { date: key, revenue: 0, orders: 0 };
        }

        orders.forEach(o => {
            const key = new Date(o.createdAt).toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].revenue += parseFloat(o.totalAmount);
                dailyMap[key].orders += 1;
            }
        });

        const chartData = Object.values(dailyMap).map(d => ({
            ...d,
            revenue: Math.round(d.revenue * 100) / 100
        }));

        res.json({ chartData, period });
    } catch (error) {
        console.error('getRevenueChart error:', error);
        res.status(500).json({ error: 'Failed to get revenue chart' });
    }
};

// ─── Top Products ───────────────────────────────────────
exports.getTopProducts = async (req, res) => {
    try {
        const storeId = req.storeId;
        const { limit = 10 } = req.query;

        const orderItems = await prisma.orderItem.findMany({
            where: { order: { storeId, status: { notIn: ['cancelled', 'refunded'] } } },
            select: { productId: true, productTitle: true, quantity: true, totalPrice: true }
        });

        // Aggregate by product
        const productMap = {};
        orderItems.forEach(item => {
            if (!productMap[item.productId]) {
                productMap[item.productId] = { productId: item.productId, title: item.productTitle, totalSold: 0, totalRevenue: 0 };
            }
            productMap[item.productId].totalSold += item.quantity;
            productMap[item.productId].totalRevenue += parseFloat(item.totalPrice);
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, parseInt(limit))
            .map(p => ({ ...p, totalRevenue: Math.round(p.totalRevenue * 100) / 100 }));

        res.json({ topProducts });
    } catch (error) {
        console.error('getTopProducts error:', error);
        res.status(500).json({ error: 'Failed to get top products' });
    }
};

// ─── Recent Orders ──────────────────────────────────────
exports.getRecentOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { storeId: req.storeId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                orderNumber: true,
                customerEmail: true,
                customerName: true,
                totalAmount: true,
                status: true,
                createdAt: true,
                _count: { select: { items: true } }
            }
        });

        res.json({
            recentOrders: orders.map(o => ({
                id: o.id,
                orderNumber: o.orderNumber,
                customer: o.customerName || o.customerEmail,
                total: parseFloat(o.totalAmount),
                status: o.status,
                itemCount: o._count.items,
                date: o.createdAt
            }))
        });
    } catch (error) {
        console.error('getRecentOrders error:', error);
        res.status(500).json({ error: 'Failed to get recent orders' });
    }
};

// ─── Order Status Breakdown ─────────────────────────────
exports.getOrderStatusBreakdown = async (req, res) => {
    try {
        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
        const counts = {};
        for (const s of statuses) {
            counts[s] = await prisma.order.count({ where: { storeId: req.storeId, status: s } });
        }
        res.json({ statusBreakdown: counts });
    } catch (error) {
        console.error('getOrderStatusBreakdown error:', error);
        res.status(500).json({ error: 'Failed to get order status breakdown' });
    }
};
