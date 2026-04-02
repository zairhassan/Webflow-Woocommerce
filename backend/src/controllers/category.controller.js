const prisma = require('../lib/prisma');

// Slugify helper
const slugify = (text) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── CATEGORIES ──────────────────────────────────────

exports.listCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { storeId: req.storeId },
            orderBy: [{ menuOrder: 'asc' }, { name: 'asc' }],
            include: {
                children: { orderBy: { menuOrder: 'asc' } },
                _count: { select: { products: true } }
            }
        });

        // Build tree (only top-level, children are included)
        const tree = categories.filter(c => !c.parentId);
        res.json({ categories: tree, total: categories.length });
    } catch (error) {
        console.error('List categories error:', error);
        res.status(500).json({ error: 'Failed to list categories' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description, parentId, imageUrl } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        let slug = slugify(name);
        const existing = await prisma.category.findFirst({
            where: { storeId: req.storeId, slug }
        });
        if (existing) slug = `${slug}-${Date.now().toString(36)}`;

        const category = await prisma.category.create({
            data: {
                storeId: req.storeId,
                name,
                slug,
                description: description || null,
                parentId: parentId || null,
                imageUrl: imageUrl || null
            }
        });

        res.status(201).json({ category });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, parentId, imageUrl, menuOrder } = req.body;

        const existing = await prisma.category.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Category not found' });

        const data = {};
        if (name !== undefined) {
            data.name = name;
            if (name !== existing.name) {
                let slug = slugify(name);
                const slugExists = await prisma.category.findFirst({
                    where: { storeId: req.storeId, slug, NOT: { id } }
                });
                if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
                data.slug = slug;
            }
        }
        if (description !== undefined) data.description = description;
        if (parentId !== undefined) data.parentId = parentId || null;
        if (imageUrl !== undefined) data.imageUrl = imageUrl;
        if (menuOrder !== undefined) data.menuOrder = menuOrder;

        const category = await prisma.category.update({ where: { id }, data });
        res.json({ category });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.category.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Category not found' });

        await prisma.category.delete({ where: { id } });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};

// ─── TAGS ────────────────────────────────────────────

exports.listTags = async (req, res) => {
    try {
        const tags = await prisma.tag.findMany({
            where: { storeId: req.storeId },
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true } } }
        });
        res.json({ tags });
    } catch (error) {
        console.error('List tags error:', error);
        res.status(500).json({ error: 'Failed to list tags' });
    }
};

exports.createTag = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        let slug = slugify(name);
        const existing = await prisma.tag.findFirst({
            where: { storeId: req.storeId, slug }
        });
        if (existing) return res.json({ tag: existing }); // Return existing tag

        const tag = await prisma.tag.create({
            data: { storeId: req.storeId, name, slug }
        });
        res.status(201).json({ tag });
    } catch (error) {
        console.error('Create tag error:', error);
        res.status(500).json({ error: 'Failed to create tag' });
    }
};

exports.deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.tag.findFirst({
            where: { id, storeId: req.storeId }
        });
        if (!existing) return res.status(404).json({ error: 'Tag not found' });

        await prisma.tag.delete({ where: { id } });
        res.json({ message: 'Tag deleted' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
};
