const nodemailer = require('nodemailer');
const prisma = require('./prisma');

let transporter = null;

// ─── Initialize transporter from store settings or env ──
async function getTransporter(storeId) {
    // Try store-level SMTP settings first
    if (storeId) {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { storeAddress: true, name: true }
        });
        const settings = store?.storeAddress || {};
        if (settings.smtpHost && settings.smtpUser) {
            return nodemailer.createTransport({
                host: settings.smtpHost,
                port: parseInt(settings.smtpPort) || 587,
                secure: (parseInt(settings.smtpPort) || 587) === 465,
                auth: {
                    user: settings.smtpUser,
                    pass: settings.smtpPass
                }
            });
        }
    }

    // Fallback to env variables
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: (parseInt(process.env.SMTP_PORT) || 587) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Dev mode: use Ethereal (fake SMTP for testing)
    if (!transporter) {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
        console.log('📧 Using Ethereal test email:', testAccount.user);
    }
    return transporter;
}

// ─── Send Email ─────────────────────────────────────────
async function sendEmail(storeId, { to, subject, html, from }) {
    try {
        const transport = await getTransporter(storeId);
        const store = storeId ? await prisma.store.findUnique({ where: { id: storeId }, select: { name: true, storeAddress: true } }) : null;
        const storeName = store?.name || 'Store';
        const fromEmail = from || store?.storeAddress?.smtpFrom || process.env.SMTP_FROM || `"${storeName}" <noreply@example.com>`;

        const info = await transport.sendMail({ from: fromEmail, to, subject, html });
        console.log(`📧 Email sent: ${subject} -> ${to} (${info.messageId})`);

        // Show Ethereal preview URL in dev
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) console.log('📧 Preview:', previewUrl);

        return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
        console.error('📧 Email failed:', error.message);
        return { success: false, error: error.message };
    }
}

// ─── Order Confirmation Email ───────────────────────────
async function sendOrderConfirmation(storeId, order, items) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true, defaultCurrency: true } });
    const storeName = store?.name || 'Store';
    const currency = store?.defaultCurrency || 'USD';

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">${item.productTitle}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right">$${Number(item.totalPrice).toFixed(2)}</td>
        </tr>
    `).join('');

    const html = emailLayout(storeName, `
        <h1 style="color:#111;font-size:24px;margin:0 0 8px">Order Confirmed!</h1>
        <p style="color:#666;font-size:15px;margin:0 0 24px">Thank you for your order, ${order.customerName || 'Customer'}.</p>

        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;color:#666">Order Number</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111">#${order.orderNumber || order.id.slice(0, 8)}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            <thead>
                <tr style="border-bottom:2px solid #e5e7eb">
                    <th style="padding:12px 16px;text-align:left;font-weight:600">Product</th>
                    <th style="padding:12px 16px;text-align:center;font-weight:600">Qty</th>
                    <th style="padding:12px 16px;text-align:right;font-weight:600">Price</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>

        <div style="border-top:2px solid #e5e7eb;padding-top:16px">
            ${Number(order.discountAmount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span style="color:#666">Discount</span><span style="color:#16a34a">-$${Number(order.discountAmount).toFixed(2)}</span></div>` : ''}
            ${Number(order.shippingAmount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span style="color:#666">Shipping</span><span>$${Number(order.shippingAmount).toFixed(2)}</span></div>` : ''}
            ${Number(order.taxAmount) > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span style="color:#666">Tax</span><span>$${Number(order.taxAmount).toFixed(2)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;margin-top:8px">
                <span>Total</span>
                <span>$${Number(order.totalAmount).toFixed(2)} ${currency}</span>
            </div>
        </div>
    `);

    return sendEmail(storeId, {
        to: order.customerEmail,
        subject: `Order Confirmed - #${order.orderNumber || order.id.slice(0, 8)} | ${storeName}`,
        html
    });
}

// ─── Welcome Email ──────────────────────────────────────
async function sendWelcomeEmail(storeId, customer) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    const storeName = store?.name || 'Store';

    const html = emailLayout(storeName, `
        <h1 style="color:#111;font-size:24px;margin:0 0 8px">Welcome to ${storeName}!</h1>
        <p style="color:#666;font-size:15px;margin:0 0 24px">Hi ${customer.firstName || 'there'}, your account has been created successfully.</p>

        <div style="background:#f0f9ff;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #3b82f6">
            <p style="margin:0;font-size:14px;color:#333"><strong>Email:</strong> ${customer.email}</p>
        </div>

        <p style="color:#666;font-size:14px;line-height:1.6">You can now:</p>
        <ul style="color:#666;font-size:14px;line-height:2;padding-left:20px">
            <li>Track your orders</li>
            <li>Save your shipping addresses</li>
            <li>Checkout faster</li>
            <li>Get exclusive offers</li>
        </ul>
    `);

    return sendEmail(storeId, {
        to: customer.email,
        subject: `Welcome to ${storeName}!`,
        html
    });
}

// ─── Password Reset Email ───────────────────────────────
async function sendPasswordResetEmail(storeId, customer, resetToken) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    const storeName = store?.name || 'Store';
    const resetUrl = `${process.env.FRONTEND_URL || 'https://yourstore.com'}/reset-password?token=${resetToken}`;

    const html = emailLayout(storeName, `
        <h1 style="color:#111;font-size:24px;margin:0 0 8px">Reset Your Password</h1>
        <p style="color:#666;font-size:15px;margin:0 0 24px">Hi ${customer.firstName || 'there'}, we received a request to reset your password.</p>

        <div style="text-align:center;margin:32px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
        </div>

        <p style="color:#999;font-size:13px;text-align:center">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `);

    return sendEmail(storeId, {
        to: customer.email,
        subject: `Reset Your Password | ${storeName}`,
        html
    });
}

// ─── Order Status Update Email ──────────────────────────
async function sendOrderStatusEmail(storeId, order, newStatus) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { name: true } });
    const storeName = store?.name || 'Store';

    const statusMessages = {
        processing: { title: 'Order is Being Processed', icon: '🔄', color: '#3b82f6' },
        shipped: { title: 'Order Has Been Shipped!', icon: '📦', color: '#8b5cf6' },
        delivered: { title: 'Order Delivered!', icon: '✅', color: '#10b981' },
        completed: { title: 'Order Complete!', icon: '🎉', color: '#16a34a' },
        cancelled: { title: 'Order Cancelled', icon: '❌', color: '#ef4444' },
        refunded: { title: 'Refund Processed', icon: '💰', color: '#6b7280' }
    };

    const info = statusMessages[newStatus] || { title: `Order Status: ${newStatus}`, icon: '📋', color: '#666' };

    const html = emailLayout(storeName, `
        <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:48px">${info.icon}</span>
        </div>
        <h1 style="color:${info.color};font-size:24px;margin:0 0 8px;text-align:center">${info.title}</h1>
        <p style="color:#666;font-size:15px;margin:0 0 24px;text-align:center">Order #${order.orderNumber || order.id.slice(0, 8)}</p>

        <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center">
            <p style="margin:0;font-size:14px;color:#666">Total: <strong>$${Number(order.totalAmount).toFixed(2)}</strong></p>
        </div>
    `);

    return sendEmail(storeId, {
        to: order.customerEmail,
        subject: `${info.title} - Order #${order.orderNumber || order.id.slice(0, 8)} | ${storeName}`,
        html
    });
}

// ─── Email Layout Template ──────────────────────────────
function emailLayout(storeName, bodyContent) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
        <div style="max-width:600px;margin:0 auto;padding:20px">
            <!-- Header -->
            <div style="background:#111;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
                <h2 style="color:#fff;margin:0;font-size:20px;letter-spacing:0.5px">${storeName}</h2>
            </div>

            <!-- Body -->
            <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
                ${bodyContent}
            </div>

            <!-- Footer -->
            <div style="text-align:center;padding:24px;color:#999;font-size:12px">
                <p style="margin:0">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
                <p style="margin:8px 0 0">Powered by Webflow Commerce Engine</p>
            </div>
        </div>
    </body>
    </html>`;
}

// ─── Test SMTP Connection ───────────────────────────────
async function testSmtpConnection(smtpConfig) {
    try {
        const transport = nodemailer.createTransport({
            host: smtpConfig.smtpHost,
            port: parseInt(smtpConfig.smtpPort) || 587,
            secure: (parseInt(smtpConfig.smtpPort) || 587) === 465,
            auth: { user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass }
        });
        await transport.verify();
        return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

module.exports = {
    sendEmail,
    sendOrderConfirmation,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendOrderStatusEmail,
    testSmtpConnection
};
