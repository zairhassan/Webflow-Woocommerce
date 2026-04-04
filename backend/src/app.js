const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const adminProductRoutes = require('./routes/admin.product.routes');
const adminOrderRoutes = require('./routes/admin.order.routes');
const adminStoreRoutes = require('./routes/admin.store.routes');
const adminCategoryRoutes = require('./routes/admin.category.routes');
const adminCouponRoutes = require('./routes/admin.coupon.routes');
const adminCustomerRoutes = require('./routes/admin.customer.routes');
const adminShippingRoutes = require('./routes/admin.shipping.routes');
const adminTaxRoutes = require('./routes/admin.tax.routes');
const adminAnalyticsRoutes = require('./routes/admin.analytics.routes');
const customerRoutes = require('./routes/customer.routes');
const publicRoutes = require('./routes/public.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const webhookRoutes = require('./routes/webhook.routes');
const adminPaymentRoutes = require('./routes/admin.payment.routes');
const publicPaymentRoutes = require('./routes/public.payment.routes');

const app = express();

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// IMPORTANT: CORS must be at the very top for Vercel/Production
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Key'],
    credentials: true
}));

// Security
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

// Serve uploaded images and SDK
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Bulletproof SDK serving (Injected directly into memory to bypass Vercel FS issues)
const SDK_CONTENT = `/**
 * Webflow Commerce Engine SDK v2.0
 */
(function () {
    'use strict';
    const SCRIPT_TAG = document.currentScript;
    const STORE_KEY = SCRIPT_TAG ? SCRIPT_TAG.getAttribute('data-store-key') : null;
    const API_BASE = SCRIPT_TAG ? (SCRIPT_TAG.getAttribute('data-api-url') || 'https://webflow-woocommerce.vercel.app') : 'https://webflow-woocommerce.vercel.app';
    const CURRENCY_SYMBOL = SCRIPT_TAG ? (SCRIPT_TAG.getAttribute('data-currency') || '$') : '$';
    if (!STORE_KEY) { console.error('[CommerceEngine] Missing data-store-key attribute on script tag'); return; }
    const CART_KEY = \`wf_cart_\${STORE_KEY}\`;
    const CUSTOMER_KEY = \`wf_customer_\${STORE_KEY}\`;
    const COUPON_KEY = \`wf_coupon_\${STORE_KEY}\`;
    function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] }; } catch { return { items: [] }; } }
    function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCartUI(); updateCartBadges(); }
    function getCustomer() { try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)); } catch { return null; } }
    function saveCustomer(data) { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); }
    function clearCustomer() { localStorage.removeItem(CUSTOMER_KEY); }
    function getCustomerToken() { return getCustomer()?.token || null; }
    function getAppliedCoupon() { try { return JSON.parse(localStorage.getItem(COUPON_KEY)); } catch { return null; } }
    function saveAppliedCoupon(data) { localStorage.setItem(COUPON_KEY, JSON.stringify(data)); }
    function clearAppliedCoupon() { localStorage.removeItem(COUPON_KEY); }
    function addToCart(productId, variantId, title, price, imageUrl, quantity = 1, salePrice = null) {
        const cart = getCart();
        const existingIndex = cart.items.findIndex(i => i.productId === productId && i.variantId === (variantId || null));
        const effectivePrice = salePrice || price;
        if (existingIndex > -1) { cart.items[existingIndex].quantity += quantity; } 
        else { cart.items.push({ productId, variantId: variantId || null, title, price: parseFloat(effectivePrice), originalPrice: salePrice ? parseFloat(price) : null, imageUrl, quantity, variantLabel: null }); }
        saveCart(cart); showCart(); showToast(\`\${title} added to cart!\`);
        document.dispatchEvent(new CustomEvent('ce-added-to-cart', { detail: { productId, variantId, title, price: effectivePrice, quantity } }));
    }
    function removeFromCart(index) { const cart = getCart(); cart.items.splice(index, 1); saveCart(cart); }
    function updateQuantity(index, newQty) { const cart = getCart(); if (newQty <= 0) { cart.items.splice(index, 1); } else { cart.items[index].quantity = newQty; } saveCart(cart); }
    function getCartTotal() { return getCart().items.reduce((sum, item) => sum + (item.price * item.quantity), 0); }
    function getCartCount() { return getCart().items.reduce((sum, item) => sum + item.quantity, 0); }
    async function api(endpoint, options = {}) {
        const url = \`\${API_BASE}/api/v1\${endpoint}\`;
        const headers = { 'Content-Type': 'application/json', 'X-Store-Key': STORE_KEY, ...options.headers };
        const token = getCustomerToken(); if (token) headers['Authorization'] = \`Bearer \${token}\`;
        const config = { ...options, headers }; if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);
        const response = await fetch(url, config); const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API request failed'); return data;
    }
    let cartSidebar = null;
    function createCartSidebar() {
        cartSidebar = document.querySelector('[data-commerce="cart-sidebar"]');
        if (cartSidebar && cartSidebar.querySelector('.wfc-sidebar')) return;
        if (!cartSidebar) { cartSidebar = document.createElement('div'); cartSidebar.id = 'wf-commerce-cart'; cartSidebar.setAttribute('data-commerce', 'cart-sidebar'); document.body.appendChild(cartSidebar); }
        cartSidebar.innerHTML = \`
      <div class="wfc-overlay" onclick="window.__commerceEngine.hideCart()"></div>
      <div class="wfc-sidebar">
        <div class="wfc-sidebar-header"><h3>Your Cart</h3><button class="wfc-close" onclick="window.__commerceEngine.hideCart()">&times;</button></div>
        <div class="wfc-sidebar-body" id="wfc-cart-items"></div>
        <div class="wfc-sidebar-footer">
          <div id="wfc-coupon-area">
             <div class="wfc-coupon-row" id="wfc-discount-row" style="display:none"><span>Discount</span><span id="wfc-discount-amount">-$0.00</span></div>
             <div class="wfc-coupon-input-wrap"><input type="text" id="wfc-coupon-input" placeholder="Coupon Code" /><button id="wfc-coupon-btn" onclick="window.__commerceEngine.applyCoupon()">Apply</button></div>
             <div id="wfc-coupon-applied" style="display:none"></div>
          </div>
          <div class="wfc-summary-row"><span>Subtotal</span><span id="wfc-cart-subtotal">$0.00</span></div>
          <div class="wfc-summary-row wfc-total-row"><span>Total</span><span id="wfc-cart-total">$0.00</span></div>
          <button class="wfc-checkout-btn" data-commerce="checkout-btn" onclick="window.__commerceEngine.checkout()">Checkout Now</button>
        </div>
      </div>\`;
        const style = document.createElement('style'); style.textContent = getCartStyles(); document.head.appendChild(style);
        const coupon = getAppliedCoupon(); if (coupon) updateCouponUI(coupon);
    }
    function renderCartUI() {
        const container = document.getElementById('wfc-cart-items'); const subtotalEl = document.getElementById('wfc-cart-subtotal'); const totalEl = document.getElementById('wfc-cart-total');
        if (!container) return; const cart = getCart();
        if (cart.items.length === 0) { container.innerHTML = '<div class="wfc-empty-cart"><p>Your cart is empty</p></div>'; if (subtotalEl) subtotalEl.textContent = \`\${CURRENCY_SYMBOL}0.00\`; if (totalEl) totalEl.textContent = \`\${CURRENCY_SYMBOL}0.00\`; return; }
        container.innerHTML = cart.items.map((item, i) => \`
      <div class="wfc-cart-item">
        \${item.imageUrl ? \`<img src="\${item.imageUrl}" alt="\${item.title}" class="wfc-item-img">\` : '<div class="wfc-item-img wfc-placeholder"></div>'}
        <div class="wfc-item-info">
          <div class="wfc-item-title">\${item.title}</div>
          \${item.variantLabel ? \`<div class="wfc-item-variant">\${item.variantLabel}</div>\` : ''}
          <div class="wfc-item-price">\${CURRENCY_SYMBOL}\${item.price.toFixed(2)}</div>
          <div class="wfc-item-qty"><button onclick="window.__commerceEngine.updateQty(\${i}, \${item.quantity - 1})">-</button><span>\${item.quantity}</span><button onclick="window.__commerceEngine.updateQty(\${i}, \${item.quantity + 1})">+</button></div>
        </div>
        <button class="wfc-remove" onclick="window.__commerceEngine.removeItem(\${i})">&times;</button>
      </div>\`).join('');
        const subtotal = getCartTotal(); if (subtotalEl) subtotalEl.textContent = \`\${CURRENCY_SYMBOL}\${subtotal.toFixed(2)}\`;
        const coupon = getAppliedCoupon(); if (coupon && coupon.valid) { const discount = coupon.discountAmount || 0; const total = Math.max(0, subtotal - discount); if (totalEl) totalEl.textContent = \`\${CURRENCY_SYMBOL}\${total.toFixed(2)}\`; } 
        else { if (totalEl) totalEl.textContent = \`\${CURRENCY_SYMBOL}\${subtotal.toFixed(2)}\`; }
    }
    function showCart() { if (cartSidebar) cartSidebar.classList.add('wfc-open'); }
    function hideCart() { if (cartSidebar) cartSidebar.classList.remove('wfc-open'); }
    function updateCartBadges() { document.querySelectorAll('[data-commerce="cart-count"]').forEach(el => { el.textContent = getCartCount(); }); }
    async function applyCoupon() {
        const input = document.getElementById('wfc-coupon-input'); const btn = document.getElementById('wfc-coupon-btn'); if (!input || !input.value.trim()) return;
        btn.textContent = '...'; btn.disabled = true;
        try {
            const cart = getCart();
            const data = await api('/public/cart/validate', { method: 'POST', body: { items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })), couponCode: input.value.trim() } });
            if (data.discount && data.discount.valid) { saveAppliedCoupon(data.discount); updateCouponUI(data.discount); showToast('Coupon applied!'); input.value = ''; } 
            else { showToast(data.discount?.error || 'Invalid coupon'); }
        } catch (error) { showToast('Could not validate coupon'); }
        btn.textContent = 'Apply'; btn.disabled = false; renderCartUI();
    }
    function removeCoupon() { clearAppliedCoupon(); renderCartUI(); }
    function updateCouponUI(coupon) {
        const appliedEl = document.getElementById('wfc-coupon-applied'); const discountRow = document.getElementById('wfc-discount-row'); const discountAmount = document.getElementById('wfc-discount-amount');
        if (appliedEl) { appliedEl.innerHTML = \`<span class="wfc-coupon-tag">\${coupon.code} <button onclick="window.__commerceEngine.removeCoupon()">&times;</button></span>\`; appliedEl.style.display = 'flex'; }
        if (discountRow) discountRow.style.display = 'flex'; if (discountAmount) discountAmount.textContent = \`-\${CURRENCY_SYMBOL}\${coupon.discountAmount.toFixed(2)}\`;
    }
    async function checkout() {
        const cart = getCart(); if (cart.items.length === 0) { showToast('Your cart is empty'); return; }
        try {
            const body = { items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) };
            const coupon = getAppliedCoupon(); if (coupon && coupon.valid) body.couponCode = coupon.code;
            const customerToken = getCustomerToken(); if (customerToken) body.customerToken = customerToken;
            const data = await api('/checkout/create-session', { method: 'POST', body });
            if (data.url) { localStorage.removeItem(CART_KEY); clearAppliedCoupon(); window.location.href = data.url; }
        } catch (error) { showToast('Checkout failed: ' + error.message); }
    }
    function fillProductFields(element, product) {
        const fields = element.querySelectorAll('[data-field]');
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            switch (fieldName) {
                case 'title': field.textContent = product.title; break;
                case 'price': if (product.onSale) { field.innerHTML = \`<span class="wfc-original-price">\${CURRENCY_SYMBOL}\${parseFloat(product.price).toFixed(2)}</span> <span class="wfc-sale-price">\${CURRENCY_SYMBOL}\${parseFloat(product.salePrice).toFixed(2)}</span>\`; } else { field.textContent = \`\${CURRENCY_SYMBOL}\${parseFloat(product.price).toFixed(2)}\`; } break;
                case 'description': field.innerHTML = product.description || ''; break;
                case 'image': if (product.imageUrl) { if (field.tagName === 'IMG') { field.src = product.imageUrl; field.alt = product.title; } else { field.style.backgroundImage = \`url(\${product.imageUrl})\`; } } break;
            }
        });
    }
    async function renderProductList(categorySlug = null) {
        const containers = document.querySelectorAll('[data-commerce="product-list"]'); if (containers.length === 0) return;
        try {
            const data = await api('/public/products');
            containers.forEach(container => {
                const template = container.querySelector('[data-commerce="product-template"]'); if (!template) return;
                template.style.display = 'none'; container.querySelectorAll('[data-commerce="product-item"]').forEach(el => el.remove());
                data.products.forEach(product => {
                    const item = template.cloneNode(true); item.style.display = ''; item.setAttribute('data-commerce', 'product-item'); fillProductFields(item, product);
                    const addBtn = item.querySelector('[data-commerce="add-to-cart"]');
                    if (addBtn) { addBtn.addEventListener('click', (e) => { e.preventDefault(); addToCart(product.id, null, product.title, product.price, product.imageUrl, 1, product.salePrice); }); }
                    const links = item.querySelectorAll('[data-commerce="product-link"]');
                    links.forEach(link => { const baseUrl = link.getAttribute('data-base-url') || 'product.html'; link.href = baseUrl.includes('?') ? \`\${baseUrl}&slug=\${product.slug}\` : \`\${baseUrl}?slug=\${product.slug}\`; });
                    container.appendChild(item);
                });
            });
        } catch (error) { console.error('[CommerceEngine] Failed to load products:', error); }
    }
    async function renderProductDetail() {
        const containers = document.querySelectorAll('[data-commerce="product-detail"]'); if (containers.length === 0) return;
        const urlParams = new URLSearchParams(window.location.search); const urlSlug = urlParams.get('slug');
        for (const container of Array.from(containers)) {
            const slug = container.getAttribute('data-product-slug') || urlSlug; if (!slug) continue;
            try {
                const data = await api(\`/public/products/\${slug}\`); const product = data.product; fillProductFields(container, product);
                const addBtn = container.querySelector('[data-commerce="add-to-cart"]');
                if (addBtn && !addBtn.__detailBound) {
                    addBtn.__detailBound = true;
                    addBtn.addEventListener('click', (e) => { e.preventDefault(); addToCart(product.id, null, product.title, product.price, product.imageUrl, 1, product.salePrice); });
                }
            } catch (error) { console.error('[CommerceEngine] Failed to load product:', error); }
        }
    }
    function showToast(message) {
        const toast = document.createElement('div'); toast.className = 'wfc-toast'; toast.textContent = message; document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('wfc-toast-show'), 10);
        setTimeout(() => { toast.classList.remove('wfc-toast-show'); setTimeout(() => toast.remove(), 300); }, 2500);
    }
    function bindButtons() {
        document.querySelectorAll('[data-commerce="cart-toggle"]').forEach(btn => { if (btn.__commerceBound) return; btn.__commerceBound = true; btn.addEventListener('click', (e) => { e.preventDefault(); showCart(); }); });
    }
    function getCartStyles() {
        return \`#wf-commerce-cart { display: none; } #wf-commerce-cart.wfc-open { display: block; } .wfc-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99998; cursor: pointer; } .wfc-sidebar { position: fixed; top: 0; right: 0; width: 400px; max-width: 90vw; height: 100%; background: #fff; z-index: 99999; display: flex; flex-direction: column; box-shadow: -4px 0 20px rgba(0,0,0,0.15); font-family: sans-serif; } .wfc-sidebar-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #eee; } .wfc-sidebar-body { flex:1; overflow-y: auto; padding: 20px; } .wfc-cart-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eee; } .wfc-item-img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; } .wfc-sidebar-footer { padding: 20px; border-top: 1px solid #eee; } .wfc-checkout-btn { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; } .wfc-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; opacity: 0; transition: all 0.3s; } .wfc-toast-show { opacity: 1; transform: translateX(-50%) translateY(0); } .wfc-original-price { text-decoration: line-through; color: #999; margin-right: 5px; } .wfc-sale-price { color: #e53e3e; font-weight: 700; }\`;
    }
    function init() { createCartSidebar(); bindButtons(); updateCartBadges(); renderCartUI(); renderProductList(); renderProductDetail(); }
    window.__commerceEngine = { addToCart, removeItem: removeFromCart, updateQty: updateQuantity, showCart, hideCart, checkout, applyCoupon, removeCoupon, refresh: init };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();\`;

app.get('/engine.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(SDK_CONTENT);
});

// Webhook route needs raw body for Stripe signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));

// Parse JSON for all other routes
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const publicLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later.' }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/admin/products', adminProductRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/store', adminStoreRoutes);
app.use('/api/v1/admin/catalog', adminCategoryRoutes);
app.use('/api/v1/admin/coupons', adminCouponRoutes);
app.use('/api/v1/admin/customers', adminCustomerRoutes);
app.use('/api/v1/admin/shipping', adminShippingRoutes);
app.use('/api/v1/admin/tax', adminTaxRoutes);
app.use('/api/v1/admin/analytics', adminAnalyticsRoutes);
app.use('/api/v1/customer', publicLimiter, customerRoutes);
app.use('/api/v1/public', publicLimiter, publicRoutes);
app.use('/api/v1/checkout', publicLimiter, checkoutRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/admin/payments', adminPaymentRoutes);
app.use('/api/v1/public/payments', publicPaymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

module.exports = app;
