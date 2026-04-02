const prisma = require('../lib/prisma');

// ─── List Shipping Zones ────────────────────────────────
exports.listZones = async (req, res) => {
    try {
        const zones = await prisma.shippingZone.findMany({
            where: { storeId: req.storeId },
            orderBy: { menuOrder: 'asc' }
        });
        res.json({ zones });
    } catch (error) {
        console.error('listZones error:', error);
        res.status(500).json({ error: 'Failed to list shipping zones' });
    }
};

// ─── Get Single Zone ────────────────────────────────────
exports.getZone = async (req, res) => {
    try {
        const zone = await prisma.shippingZone.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!zone) return res.status(404).json({ error: 'Shipping zone not found' });
        res.json({ zone });
    } catch (error) {
        console.error('getZone error:', error);
        res.status(500).json({ error: 'Failed to get shipping zone' });
    }
};

// ─── Create Zone ────────────────────────────────────────
exports.createZone = async (req, res) => {
    try {
        const { name, regions, methods, menuOrder } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const zone = await prisma.shippingZone.create({
            data: {
                storeId: req.storeId,
                name,
                regions: regions || [],
                methods: methods || [],
                menuOrder: menuOrder || 0
            }
        });
        res.status(201).json({ zone });
    } catch (error) {
        console.error('createZone error:', error);
        res.status(500).json({ error: 'Failed to create shipping zone' });
    }
};

// ─── Update Zone ────────────────────────────────────────
exports.updateZone = async (req, res) => {
    try {
        const existing = await prisma.shippingZone.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Shipping zone not found' });

        const { name, regions, methods, menuOrder } = req.body;
        const zone = await prisma.shippingZone.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(regions !== undefined && { regions }),
                ...(methods !== undefined && { methods }),
                ...(menuOrder !== undefined && { menuOrder })
            }
        });
        res.json({ zone });
    } catch (error) {
        console.error('updateZone error:', error);
        res.status(500).json({ error: 'Failed to update shipping zone' });
    }
};

// ─── Delete Zone ────────────────────────────────────────
exports.deleteZone = async (req, res) => {
    try {
        const existing = await prisma.shippingZone.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Shipping zone not found' });

        await prisma.shippingZone.delete({ where: { id: req.params.id } });
        res.json({ message: 'Shipping zone deleted' });
    } catch (error) {
        console.error('deleteZone error:', error);
        res.status(500).json({ error: 'Failed to delete shipping zone' });
    }
};

// ─── Calculate Shipping ─────────────────────────────────
// Given a country + state + cart subtotal, find matching zone & best method
exports.calculateShipping = async (storeId, country, state, subtotal) => {
    const zones = await prisma.shippingZone.findMany({
        where: { storeId },
        orderBy: { menuOrder: 'asc' }
    });

    // Find matching zone: regions is an array like ["US", "US:CA", "GB", "*"]
    let matchedZone = null;
    for (const zone of zones) {
        const regions = zone.regions || [];
        for (const r of regions) {
            if (r === '*') { matchedZone = zone; break; }
            if (r === country) { matchedZone = zone; break; }
            if (state && r === `${country}:${state}`) { matchedZone = zone; break; }
        }
        if (matchedZone) break;
    }

    if (!matchedZone) return { zone: null, method: null, cost: 0 };

    // Pick cheapest applicable method
    const methods = matchedZone.methods || [];
    let bestMethod = null;
    let bestCost = Infinity;

    for (const m of methods) {
        if (!m.enabled) continue;
        let cost = 0;

        if (m.type === 'free_shipping') {
            if (m.freeAbove && subtotal >= m.freeAbove) {
                cost = 0;
            } else if (!m.freeAbove) {
                cost = 0;
            } else {
                continue; // doesn't qualify
            }
        } else if (m.type === 'flat_rate') {
            cost = parseFloat(m.cost) || 0;
        } else if (m.type === 'local_pickup') {
            cost = parseFloat(m.cost) || 0;
        }

        if (cost < bestCost) {
            bestCost = cost;
            bestMethod = { ...m, cost };
        }
    }

    return {
        zone: { id: matchedZone.id, name: matchedZone.name },
        method: bestMethod,
        cost: bestMethod ? bestMethod.cost : 0
    };
};
