const prisma = require('../lib/prisma');

// ─── List Tax Rates ─────────────────────────────────────
exports.listTaxRates = async (req, res) => {
    try {
        const taxRates = await prisma.taxRate.findMany({
            where: { storeId: req.storeId },
            orderBy: [{ country: 'asc' }, { priority: 'asc' }]
        });
        res.json({ taxRates });
    } catch (error) {
        console.error('listTaxRates error:', error);
        res.status(500).json({ error: 'Failed to list tax rates' });
    }
};

// ─── Get Single Tax Rate ────────────────────────────────
exports.getTaxRate = async (req, res) => {
    try {
        const taxRate = await prisma.taxRate.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!taxRate) return res.status(404).json({ error: 'Tax rate not found' });
        res.json({ taxRate });
    } catch (error) {
        console.error('getTaxRate error:', error);
        res.status(500).json({ error: 'Failed to get tax rate' });
    }
};

// ─── Create Tax Rate ────────────────────────────────────
exports.createTaxRate = async (req, res) => {
    try {
        const { name, rate, country, state, postcode, city, taxClass, priority, compound, shipping } = req.body;
        if (!name || rate === undefined || !country) {
            return res.status(400).json({ error: 'Name, rate, and country are required' });
        }

        const taxRate = await prisma.taxRate.create({
            data: {
                storeId: req.storeId,
                name,
                rate: parseFloat(rate),
                country: country.toUpperCase(),
                state: state || '*',
                postcode: postcode || '*',
                city: city || '*',
                taxClass: taxClass || 'standard',
                priority: priority || 1,
                compound: compound || false,
                shipping: shipping !== false
            }
        });
        res.status(201).json({ taxRate });
    } catch (error) {
        console.error('createTaxRate error:', error);
        res.status(500).json({ error: 'Failed to create tax rate' });
    }
};

// ─── Update Tax Rate ────────────────────────────────────
exports.updateTaxRate = async (req, res) => {
    try {
        const existing = await prisma.taxRate.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Tax rate not found' });

        const { name, rate, country, state, postcode, city, taxClass, priority, compound, shipping } = req.body;
        const taxRate = await prisma.taxRate.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(rate !== undefined && { rate: parseFloat(rate) }),
                ...(country !== undefined && { country: country.toUpperCase() }),
                ...(state !== undefined && { state }),
                ...(postcode !== undefined && { postcode }),
                ...(city !== undefined && { city }),
                ...(taxClass !== undefined && { taxClass }),
                ...(priority !== undefined && { priority }),
                ...(compound !== undefined && { compound }),
                ...(shipping !== undefined && { shipping })
            }
        });
        res.json({ taxRate });
    } catch (error) {
        console.error('updateTaxRate error:', error);
        res.status(500).json({ error: 'Failed to update tax rate' });
    }
};

// ─── Delete Tax Rate ────────────────────────────────────
exports.deleteTaxRate = async (req, res) => {
    try {
        const existing = await prisma.taxRate.findFirst({
            where: { id: req.params.id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Tax rate not found' });

        await prisma.taxRate.delete({ where: { id: req.params.id } });
        res.json({ message: 'Tax rate deleted' });
    } catch (error) {
        console.error('deleteTaxRate error:', error);
        res.status(500).json({ error: 'Failed to delete tax rate' });
    }
};

// ─── Calculate Tax ──────────────────────────────────────
// Given an address + amounts, compute total tax
exports.calculateTax = async (storeId, country, state, postcode, city, amounts) => {
    // Check if store has tax enabled
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { enableTax: true } });
    if (!store || !store.enableTax) return { rates: [], totalTax: 0 };

    // Find matching tax rates
    const allRates = await prisma.taxRate.findMany({
        where: { storeId },
        orderBy: [{ priority: 'asc' }]
    });

    // Filter to matching rates
    const matchingRates = allRates.filter(r => {
        if (r.country !== country && r.country !== '*') return false;
        if (r.state !== '*' && state && r.state !== state) return false;
        if (r.postcode !== '*' && postcode && !matchPattern(r.postcode, postcode)) return false;
        if (r.city !== '*' && city && r.city.toLowerCase() !== city.toLowerCase()) return false;
        return true;
    });

    // Group by priority, pick highest-priority group
    if (matchingRates.length === 0) return { rates: [], totalTax: 0 };

    const priorityGroups = {};
    matchingRates.forEach(r => {
        if (!priorityGroups[r.priority]) priorityGroups[r.priority] = [];
        priorityGroups[r.priority].push(r);
    });

    const highestPriority = Math.min(...Object.keys(priorityGroups).map(Number));
    const applicableRates = priorityGroups[highestPriority];

    // Calculate tax
    let totalTax = 0;
    const rateDetails = [];
    const { subtotal = 0, shippingCost = 0 } = amounts;

    for (const rate of applicableRates) {
        const rateValue = parseFloat(rate.rate) / 100;
        let taxableAmount = subtotal;
        if (rate.shipping && shippingCost > 0) taxableAmount += shippingCost;
        if (rate.compound && totalTax > 0) taxableAmount += totalTax;

        const tax = Math.round(taxableAmount * rateValue * 100) / 100;
        totalTax += tax;
        rateDetails.push({
            id: rate.id,
            name: rate.name,
            rate: parseFloat(rate.rate),
            country: rate.country,
            state: rate.state,
            tax
        });
    }

    return { rates: rateDetails, totalTax };
};

// Helper: match postcode patterns like "900*" or "90001-90010"
function matchPattern(pattern, value) {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
        const prefix = pattern.replace('*', '');
        return value.startsWith(prefix);
    }
    if (pattern.includes('-')) {
        const [low, high] = pattern.split('-');
        return value >= low && value <= high;
    }
    return pattern === value;
}
