const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../lib/email');

// ─── CUSTOMER REGISTER ───────────────────────────────

exports.register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existing = await prisma.customer.findFirst({
            where: { storeId: req.storeId, email: email.toLowerCase() }
        });
        if (existing) return res.status(400).json({ error: 'Email already registered' });

        const passwordHash = await bcrypt.hash(password, 12);

        const customer = await prisma.customer.create({
            data: {
                storeId: req.storeId,
                email: email.toLowerCase(),
                passwordHash,
                firstName: firstName || null,
                lastName: lastName || null,
                phone: phone || null
            }
        });

        const token = jwt.sign(
            { customerId: customer.id, storeId: req.storeId, type: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            customer: {
                id: customer.id,
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone
            }
        });

        // Send welcome email (async, don't block response)
        sendWelcomeEmail(req.storeId, customer).catch(e => console.error('Welcome email failed:', e.message));
    } catch (error) {
        console.error('Customer register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// ─── CUSTOMER LOGIN ──────────────────────────────────

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const customer = await prisma.customer.findFirst({
            where: { storeId: req.storeId, email: email.toLowerCase() }
        });
        if (!customer) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, customer.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { customerId: customer.id, storeId: req.storeId, type: 'customer' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            customer: {
                id: customer.id,
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone
            }
        });
    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// ─── GET PROFILE ─────────────────────────────────────

exports.getProfile = async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.customerId },
            include: {
                addresses: { orderBy: { createdAt: 'desc' } },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: { items: true }
                },
                _count: { select: { orders: true, reviews: true } }
            }
        });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const { passwordHash, ...profile } = customer;
        res.json({ customer: profile });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
};

// ─── UPDATE PROFILE ──────────────────────────────────

exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const data = {};
        if (firstName !== undefined) data.firstName = firstName;
        if (lastName !== undefined) data.lastName = lastName;
        if (phone !== undefined) data.phone = phone;

        const customer = await prisma.customer.update({
            where: { id: req.customerId },
            data
        });

        const { passwordHash, ...profile } = customer;
        res.json({ customer: profile });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// ─── CHANGE PASSWORD ─────────────────────────────────

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const customer = await prisma.customer.findUnique({
            where: { id: req.customerId }
        });

        const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.customer.update({
            where: { id: req.customerId },
            data: { passwordHash }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

// ─── ADDRESS MANAGEMENT ──────────────────────────────

exports.listAddresses = async (req, res) => {
    try {
        const addresses = await prisma.address.findMany({
            where: { customerId: req.customerId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ addresses });
    } catch (error) {
        console.error('List addresses error:', error);
        res.status(500).json({ error: 'Failed to list addresses' });
    }
};

exports.addAddress = async (req, res) => {
    try {
        const { type, firstName, lastName, company, address1, address2, city, state, postcode, country, phone, isDefault } = req.body;

        if (!address1 || !city || !postcode || !country) {
            return res.status(400).json({ error: 'Address, city, postcode and country are required' });
        }

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await prisma.address.updateMany({
                where: { customerId: req.customerId, type: type || 'shipping', isDefault: true },
                data: { isDefault: false }
            });
        }

        const address = await prisma.address.create({
            data: {
                customerId: req.customerId,
                type: type || 'shipping',
                firstName: firstName || null,
                lastName: lastName || null,
                company: company || null,
                address1,
                address2: address2 || null,
                city,
                state: state || null,
                postcode,
                country,
                phone: phone || null,
                isDefault: isDefault || false
            }
        });

        res.status(201).json({ address });
    } catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.address.findFirst({
            where: { id, customerId: req.customerId }
        });
        if (!existing) return res.status(404).json({ error: 'Address not found' });

        const { type, firstName, lastName, company, address1, address2, city, state, postcode, country, phone, isDefault } = req.body;

        if (isDefault) {
            await prisma.address.updateMany({
                where: { customerId: req.customerId, type: type || existing.type, isDefault: true, NOT: { id } },
                data: { isDefault: false }
            });
        }

        const data = {};
        if (type !== undefined) data.type = type;
        if (firstName !== undefined) data.firstName = firstName;
        if (lastName !== undefined) data.lastName = lastName;
        if (company !== undefined) data.company = company;
        if (address1 !== undefined) data.address1 = address1;
        if (address2 !== undefined) data.address2 = address2;
        if (city !== undefined) data.city = city;
        if (state !== undefined) data.state = state;
        if (postcode !== undefined) data.postcode = postcode;
        if (country !== undefined) data.country = country;
        if (phone !== undefined) data.phone = phone;
        if (isDefault !== undefined) data.isDefault = isDefault;

        const address = await prisma.address.update({ where: { id }, data });
        res.json({ address });
    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.address.findFirst({
            where: { id, customerId: req.customerId }
        });
        if (!existing) return res.status(404).json({ error: 'Address not found' });

        await prisma.address.delete({ where: { id } });
        res.json({ message: 'Address deleted' });
    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
};

// ─── ORDER HISTORY ───────────────────────────────────

exports.getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { customerId: req.customerId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    featuredImage: true
                                }
                            }
                        }
                    },
                    _count: { select: { notes: true } }
                }
            }),
            prisma.order.count({ where: { customerId: req.customerId } })
        ]);

        res.json({
            orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
};

// ─── ADMIN: LIST ALL CUSTOMERS ───────────────────────

exports.listCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        const where = { storeId: req.storeId };
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, email: true, firstName: true, lastName: true, phone: true,
                    createdAt: true,
                    _count: { select: { orders: true, reviews: true, addresses: true } }
                }
            }),
            prisma.customer.count({ where })
        ]);

        res.json({
            customers,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('List customers error:', error);
        res.status(500).json({ error: 'Failed to list customers' });
    }
};

// ─── ADMIN: GET CUSTOMER DETAIL ──────────────────────

exports.getCustomerDetail = async (req, res) => {
    try {
        const customer = await prisma.customer.findFirst({
            where: { id: req.params.id, storeId: req.storeId },
            include: {
                addresses: true,
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { items: true }
                },
                reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
                _count: { select: { orders: true, reviews: true } }
            }
        });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const { passwordHash, ...detail } = customer;
        res.json({ customer: detail });
    } catch (error) {
        console.error('Get customer detail error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
};

// ─── FORGOT PASSWORD ───────────────────────────────────────

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const customer = await prisma.customer.findFirst({
            where: { storeId: req.storeId, email: email.toLowerCase() }
        });

        // Always return success to prevent email enumeration
        if (!customer) return res.json({ message: 'If that email exists, a reset link has been sent.' });

        // Generate reset token (1 hour expiry)
        const resetToken = jwt.sign(
            { customerId: customer.id, storeId: req.storeId, type: 'password_reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        await sendPasswordResetEmail(req.storeId, customer, resetToken);
        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
};

// ─── RESET PASSWORD ────────────────────────────────────────

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.customer.update({
            where: { id: decoded.customerId },
            data: { passwordHash }
        });

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

// ─── PRODUCT REVIEWS ───────────────────────────────────────

exports.addReview = async (req, res) => {
    try {
        const { productId, rating, title, content } = req.body;
        if (!productId || !rating) {
            return res.status(400).json({ error: 'Product ID and rating (1-5) are required' });
        }

        // Get customer data for the review
        const customer = await prisma.customer.findUnique({
            where: { id: req.customerId }
        });

        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const review = await prisma.review.create({
            data: {
                storeId: req.storeId,
                productId,
                customerId: req.customerId,
                authorName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Anonymous',
                authorEmail: customer.email,
                rating: parseInt(rating),
                title: title || null,
                content: content || null,
                isApproved: true // Auto-approve for now
            }
        });

        res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};
