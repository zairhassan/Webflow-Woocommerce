/**
 * Webflow Commerce Engine SDK v2.0
 * 
 * Drop this script into any Webflow site to enable ecommerce.
 * 
 * Usage:
 * <script src="https://cdn.your-saas.com/engine.js" data-store-key="pk_live_xxx"></script>
 * 
 * HTML Attributes:
 * - data-commerce="product-list"      -> Container for product grid
 * - data-commerce="product-detail"    -> Container for single product
 * - data-commerce="add-to-cart"       -> Add to cart button (needs data-product-id)
 * - data-commerce="cart-toggle"       -> Cart open/close toggle button
 * - data-commerce="cart-count"        -> Shows cart item count
 * - data-commerce="cart-sidebar"      -> Cart sidebar container (auto-created if missing)
 * - data-commerce="checkout-btn"      -> Checkout button inside cart
 * - data-commerce="category-filter"   -> Category filter bar/sidebar
 * - data-commerce="customer-login"    -> Login/Register button
 * - data-commerce="account-link"      -> My Account link (shows when logged in)
 * - data-field="title|price|sale-price|image|description|category|rating|badge|stock-status|sku"
 */

(function () {
    'use strict';

    // --- Configuration ---
    const SCRIPT_TAG = document.currentScript;
    const STORE_KEY = SCRIPT_TAG ? SCRIPT_TAG.getAttribute('data-store-key') : null;
    const API_BASE = SCRIPT_TAG ? (SCRIPT_TAG.getAttribute('data-api-url') || 'https://webflow-woocommerce.vercel.app') : 'https://webflow-woocommerce.vercel.app';
    const CURRENCY_SYMBOL = SCRIPT_TAG ? (SCRIPT_TAG.getAttribute('data-currency') || '$') : '$';

    if (!STORE_KEY) {
        console.error('[CommerceEngine] Missing data-store-key attribute on script tag');
        return;
    }

    // --- Cart State ---
    const CART_KEY = `wf_cart_${STORE_KEY}`;
    const CUSTOMER_KEY = `wf_customer_${STORE_KEY}`;
    const COUPON_KEY = `wf_coupon_${STORE_KEY}`;

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [] }; }
        catch { return { items: [] }; }
    }
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCartUI();
        updateCartBadges();
    }

    // --- Customer Auth State ---
    function getCustomer() {
        try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)); }
        catch { return null; }
    }
    function saveCustomer(data) { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); }
    function clearCustomer() { localStorage.removeItem(CUSTOMER_KEY); }
    function getCustomerToken() { return getCustomer()?.token || null; }

    // --- Coupon State ---
    function getAppliedCoupon() {
        try { return JSON.parse(localStorage.getItem(COUPON_KEY)); }
        catch { return null; }
    }
    function saveAppliedCoupon(data) { localStorage.setItem(COUPON_KEY, JSON.stringify(data)); }
    function clearAppliedCoupon() { localStorage.removeItem(COUPON_KEY); }

    // --- Cart Operations ---
    function addToCart(productId, variantId, title, price, imageUrl, quantity = 1, salePrice = null) {
        const cart = getCart();
        const existingIndex = cart.items.findIndex(
            i => i.productId === productId && i.variantId === (variantId || null)
        );
        const effectivePrice = salePrice || price;

        if (existingIndex > -1) {
            cart.items[existingIndex].quantity += quantity;
        } else {
            cart.items.push({
                productId, variantId: variantId || null,
                title, price: parseFloat(effectivePrice),
                originalPrice: salePrice ? parseFloat(price) : null,
                imageUrl, quantity,
                variantLabel: null  // Will be set by variant selector
            });
        }
        saveCart(cart);
        showCart();
        showToast(`${title} added to cart!`);

        // Dispatch custom event for limitless Webflow interactions
        document.dispatchEvent(new CustomEvent('ce-added-to-cart', {
            detail: { productId, variantId, title, price: effectivePrice, quantity }
        }));
    }

    function removeFromCart(index) {
        const cart = getCart();
        cart.items.splice(index, 1);
        saveCart(cart);
    }

    function updateQuantity(index, newQty) {
        const cart = getCart();
        if (newQty <= 0) { cart.items.splice(index, 1); }
        else { cart.items[index].quantity = newQty; }
        saveCart(cart);
    }

    function getCartTotal() {
        return getCart().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    function getCartCount() {
        return getCart().items.reduce((sum, item) => sum + item.quantity, 0);
    }

    // --- API Helpers ---
    async function api(endpoint, options = {}) {
        const url = `${API_BASE}/api/v1${endpoint}`;
        const headers = { 'Content-Type': 'application/json', 'X-Store-Key': STORE_KEY, ...options.headers };
        const token = getCustomerToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { ...options, headers };
        if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);

        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API request failed');
        return data;
    }

    // --- Cart Sidebar UI ---
    let cartSidebar = null;

    function createCartSidebar() {
        cartSidebar = document.querySelector('[data-commerce="cart-sidebar"]');
        if (cartSidebar) {
            // Check if it's already initialized to avoid duplication
            if (cartSidebar.querySelector('.wfc-sidebar')) return;
        }

        if (!cartSidebar) {
            cartSidebar = document.createElement('div');
            cartSidebar.id = 'wf-commerce-cart';
            cartSidebar.setAttribute('data-commerce', 'cart-sidebar');
            document.body.appendChild(cartSidebar);
        }

        cartSidebar.innerHTML = `
      <div class="wfc-overlay" onclick="window.__commerceEngine.hideCart()"></div>
      <div class="wfc-sidebar">
        <div class="wfc-sidebar-header">
          <h3>Your Cart</h3>
          <button class="wfc-close" onclick="window.__commerceEngine.hideCart()">&times;</button>
        </div>
        <div class="wfc-sidebar-body" id="wfc-cart-items"></div>
        <div class="wfc-sidebar-footer">
          <div id="wfc-coupon-area">
             <div class="wfc-coupon-row" id="wfc-discount-row" style="display:none">
                <span>Discount</span>
                <span id="wfc-discount-amount">-$0.00</span>
             </div>
             <div class="wfc-coupon-input-wrap">
                <input type="text" id="wfc-coupon-input" placeholder="Coupon Code" />
                <button id="wfc-coupon-btn" onclick="window.__commerceEngine.applyCoupon()">Apply</button>
             </div>
             <div id="wfc-coupon-applied" style="display:none"></div>
          </div>
          <div class="wfc-summary-row">
            <span>Subtotal</span>
            <span id="wfc-cart-subtotal">$0.00</span>
          </div>
          <div class="wfc-summary-row wfc-total-row">
            <span>Total</span>
            <span id="wfc-cart-total">$0.00</span>
          </div>
          <button class="wfc-checkout-btn" data-commerce="checkout-btn" onclick="window.__commerceEngine.checkout()">Checkout Now</button>
        </div>
      </div>
    `;

        const style = document.createElement('style');
        style.textContent = getCartStyles();
        document.head.appendChild(style);

        // Restore applied coupon
        const coupon = getAppliedCoupon();
        if (coupon) updateCouponUI(coupon);
    }

    function renderCartUI() {
        const container = document.getElementById('wfc-cart-items');
        const subtotalEl = document.getElementById('wfc-cart-subtotal');
        const totalEl = document.getElementById('wfc-cart-total');
        if (!container) return;

        const cart = getCart();

        if (cart.items.length === 0) {
            container.innerHTML = '<div class="wfc-empty-cart"><p>Your cart is empty</p></div>';
            if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}0.00`;
            if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}0.00`;
            return;
        }

        container.innerHTML = cart.items.map((item, i) => `
      <div class="wfc-cart-item">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="wfc-item-img">` : '<div class="wfc-item-img wfc-placeholder"></div>'}
        <div class="wfc-item-info">
          <div class="wfc-item-title">${item.title}</div>
          ${item.variantLabel ? `<div class="wfc-item-variant">${item.variantLabel}</div>` : ''}
          <div class="wfc-item-price">
            ${CURRENCY_SYMBOL}${item.price.toFixed(2)}
          </div>
          <div class="wfc-item-qty">
            <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity + 1})">+</button>
          </div>
        </div>
        <button class="wfc-remove" onclick="window.__commerceEngine.removeItem(${i})">&times;</button>
      </div>
    `).join('');

        const subtotal = getCartTotal();
        if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;

        // Calculate total with discount
        const coupon = getAppliedCoupon();
        if (coupon && coupon.valid) {
            const discount = coupon.discountAmount || 0;
            const total = Math.max(0, subtotal - discount);
            if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}${total.toFixed(2)}`;
        } else {
            if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;
        }
    }

    function showCart() { if (cartSidebar) cartSidebar.classList.add('wfc-open'); }
    function hideCart() { if (cartSidebar) cartSidebar.classList.remove('wfc-open'); }

    function updateCartBadges() {
        document.querySelectorAll('[data-commerce="cart-count"]').forEach(el => {
            el.textContent = getCartCount();
        });
    }

    // --- Coupon System ---
    async function applyCoupon() {
        const input = document.getElementById('wfc-coupon-input');
        const btn = document.getElementById('wfc-coupon-btn');
        if (!input || !input.value.trim()) return;

        btn.textContent = '...';
        btn.disabled = true;

        try {
            const cart = getCart();
            const data = await api('/public/cart/validate', {
                method: 'POST',
                body: {
                    items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
                    couponCode: input.value.trim()
                }
            });

            if (data.discount && data.discount.valid) {
                saveAppliedCoupon(data.discount);
                updateCouponUI(data.discount);
                showToast('Coupon applied!');
                input.value = '';
            } else {
                showToast(data.discount?.error || 'Invalid coupon');
            }
        } catch (error) {
            showToast('Could not validate coupon');
        }

        btn.textContent = 'Apply';
        btn.disabled = false;
        renderCartUI();
    }

    function removeCoupon() {
        clearAppliedCoupon();
        const appliedEl = document.getElementById('wfc-coupon-applied');
        const couponRow = document.getElementById('wfc-coupon-row');
        const discountRow = document.getElementById('wfc-discount-row');
        if (appliedEl) appliedEl.style.display = 'none';
        if (couponRow) couponRow.style.display = 'flex';
        if (discountRow) discountRow.style.display = 'none';
        renderCartUI();
    }

    function updateCouponUI(coupon) {
        const appliedEl = document.getElementById('wfc-coupon-applied');
        const couponRow = document.getElementById('wfc-coupon-row');
        const discountRow = document.getElementById('wfc-discount-row');
        const discountAmount = document.getElementById('wfc-discount-amount');

        if (appliedEl) {
            appliedEl.innerHTML = `< span class="wfc-coupon-tag" > ${coupon.code} <button onclick="window.__commerceEngine.removeCoupon()">&times;</button></span > `;
            appliedEl.style.display = 'flex';
        }
        if (couponRow) couponRow.style.display = 'none';
        if (discountRow) discountRow.style.display = 'flex';
        if (discountAmount) discountAmount.textContent = `- ${CURRENCY_SYMBOL}${coupon.discountAmount.toFixed(2)} `;
    }

    // --- Customer Auth Modal ---
    let authModal = null;

    function showAuthModal(mode = 'login') {
        if (authModal) { authModal.remove(); }

        authModal = document.createElement('div');
        authModal.className = 'wfc-auth-modal';
        authModal.innerHTML = `
            < div class="wfc-auth-overlay" onclick = "window.__commerceEngine.closeAuth()" ></div >
                <div class="wfc-auth-box">
                    <button class="wfc-close" onclick="window.__commerceEngine.closeAuth()">&times;</button>
                    <div class="wfc-auth-tabs">
                        <button class="wfc-auth-tab ${mode === 'login' ? 'active' : ''}" onclick="window.__commerceEngine.switchAuth('login')">Sign In</button>
                        <button class="wfc-auth-tab ${mode === 'register' ? 'active' : ''}" onclick="window.__commerceEngine.switchAuth('register')">Register</button>
                    </div>
                    <form id="wfc-auth-form" onsubmit="event.preventDefault(); window.__commerceEngine.submitAuth()">
                        <div id="wfc-auth-fields">
                            ${mode === 'register' ? `
                    <input type="text" id="wfc-auth-firstname" placeholder="First Name" class="wfc-auth-input" />
                    <input type="text" id="wfc-auth-lastname" placeholder="Last Name" class="wfc-auth-input" />
                    ` : ''}
                            <input type="email" id="wfc-auth-email" placeholder="Email" class="wfc-auth-input" required />
                            <input type="password" id="wfc-auth-password" placeholder="Password" class="wfc-auth-input" required />
                        </div>
                        <div id="wfc-auth-error" class="wfc-auth-error" style="display:none"></div>
                        <button type="submit" class="wfc-auth-submit">${mode === 'login' ? 'Sign In' : 'Create Account'}</button>
                    </form>
                </div>
        `;
        authModal.dataset.mode = mode;
        document.body.appendChild(authModal);
        setTimeout(() => authModal.classList.add('wfc-open'), 10);
    }

    function closeAuth() {
        if (authModal) { authModal.classList.remove('wfc-open'); setTimeout(() => { authModal.remove(); authModal = null; }, 300); }
    }

    function switchAuth(mode) {
        closeAuth();
        setTimeout(() => showAuthModal(mode), 100);
    }

    async function submitAuth() {
        const mode = authModal?.dataset.mode || 'login';
        const email = document.getElementById('wfc-auth-email')?.value;
        const password = document.getElementById('wfc-auth-password')?.value;
        const errorEl = document.getElementById('wfc-auth-error');
        const submitBtn = authModal?.querySelector('.wfc-auth-submit');

        if (!email || !password) return;
        if (submitBtn) { submitBtn.textContent = 'Please wait...'; submitBtn.disabled = true; }

        try {
            const body = { email, password };
            if (mode === 'register') {
                body.firstName = document.getElementById('wfc-auth-firstname')?.value || '';
                body.lastName = document.getElementById('wfc-auth-lastname')?.value || '';
            }

            const data = await api(`/ customer / ${mode} `, { method: 'POST', body });
            saveCustomer({ token: data.token, email: data.customer.email, name: data.customer.firstName || email.split('@')[0] });
            closeAuth();
            updateAccountUI();
            showToast(`Welcome${data.customer.firstName ? ', ' + data.customer.firstName : ''} !`);
        } catch (error) {
            if (errorEl) { errorEl.textContent = error.message; errorEl.style.display = 'block'; }
            if (submitBtn) { submitBtn.textContent = mode === 'login' ? 'Sign In' : 'Create Account'; submitBtn.disabled = false; }
        }
    }

    function logout() {
        clearCustomer();
        updateAccountUI();
        showToast('Signed out');
    }

    function updateAccountUI() {
        const customer = getCustomer();
        document.querySelectorAll('[data-commerce="customer-login"]').forEach(el => {
            el.style.display = customer ? 'none' : '';
        });
        document.querySelectorAll('[data-commerce="account-link"]').forEach(el => {
            if (customer) {
                el.style.display = '';
                el.textContent = el.getAttribute('data-label') || customer.name || 'My Account';
            } else {
                el.style.display = 'none';
            }
        });
    }

    // --- Toast Notification ---
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'wfc-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('wfc-toast-show'), 10);
        setTimeout(() => {
            toast.classList.remove('wfc-toast-show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // --- Category Filter ---
    async function renderCategoryFilter() {
        const containers = document.querySelectorAll('[data-commerce="category-filter"]');
        if (containers.length === 0) return;

        try {
            const data = await api('/public/categories');
            containers.forEach(container => {
                const topLevel = data.categories.filter(c => !c.parentId);
                container.innerHTML = `
            < div class="wfc-category-list" >
                <button class="wfc-cat-btn active" data-cat-slug="">All Products</button>
            ${topLevel.map(c => `
              <button class="wfc-cat-btn" data-cat-slug="${c.slug}">${c.name} <span class="wfc-cat-count">(${c.productCount})</span></button>
              ${(c.children || []).map(child => {
                    const ch = data.categories.find(x => x.id === child.id);
                    return ch ? `<button class="wfc-cat-btn wfc-cat-child" data-cat-slug="${ch.slug}">${ch.name} <span class="wfc-cat-count">(${ch.productCount})</span></button>` : '';
                }).join('')}
            `).join('')
                    }
          </div >
            `;

                // Bind click events
                container.querySelectorAll('.wfc-cat-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        container.querySelectorAll('.wfc-cat-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        const slug = btn.getAttribute('data-cat-slug');
                        renderProductList(slug || null);
                    });
                });
            });
        } catch (error) {
            console.error('[CommerceEngine] Failed to load categories:', error);
        }
    }

    // --- Product Rendering ---
    async function renderProductList(categorySlug = null) {
        const containers = document.querySelectorAll('[data-commerce="product-list"]');
        if (containers.length === 0) return;

        try {
            const data = await api('/public/products');

            containers.forEach(container => {
                const type = container.getAttribute('data-type');
                const catSlug = container.getAttribute('data-category');

                let filteredProducts = data.products;

                // Filter by category
                const effectiveCategory = categorySlug || catSlug;
                if (effectiveCategory) {
                    filteredProducts = filteredProducts.filter(p => p.category?.slug === effectiveCategory);
                }

                // Filter by featured if requested
                if (type === 'featured') {
                    filteredProducts = filteredProducts.filter(p => p.featured === true);
                }

                // Filter by collection slug if requested
                if (collection) {
                    filteredProducts = filteredProducts.filter(p => p.category?.slug === collection);
                }

                const template = container.querySelector('[data-commerce="product-template"]');
                if (!template) return;

                template.style.display = 'none';
                container.querySelectorAll('[data-commerce="product-item"]').forEach(el => el.remove());

                filteredProducts.forEach(product => {
                    const item = template.cloneNode(true);
                    item.style.display = '';
                    item.setAttribute('data-commerce', 'product-item');
                    item.setAttribute('data-product-id', product.id);

                    fillProductFields(item, product);

                    const addBtn = item.querySelector('[data-commerce="add-to-cart"]');
                    if (addBtn) {
                        addBtn.setAttribute('data-product-id', product.id);
                        addBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            addToCart(product.id, null, product.title, product.price, product.imageUrl, 1, product.salePrice);
                        });
                    }

                    // Product link handling
                    const links = item.querySelectorAll('[data-commerce="product-link"]');
                    links.forEach(link => {
                        const baseUrl = link.getAttribute('data-base-url') || 'product.html';
                        link.href = baseUrl.includes('?') ? `${baseUrl}& slug=${product.slug} ` : `${baseUrl}?slug = ${product.slug} `;
                    });

                    // Support for entire card as a link
                    if (item.getAttribute('data-commerce') === 'product-item' && item.tagName === 'A') {
                        const baseUrl = item.getAttribute('data-base-url') || 'product.html';
                        item.href = baseUrl.includes('?') ? `${baseUrl}& slug=${product.slug} ` : `${baseUrl}?slug = ${product.slug} `;
                    }

                    container.appendChild(item);
                });
            });
        } catch (error) {
            console.error('[CommerceEngine] Failed to load products:', error);
        }
    }

    async function renderProductDetail() {
        const containers = document.querySelectorAll('[data-commerce="product-detail"], [data-product-scope]');
        if (containers.length === 0) return;

        // Get slug from URL
        const urlParams = new URLSearchParams(window.location.search);
        let urlSlug = urlParams.get('slug');
        if (!urlSlug) {
            const parts = window.location.pathname.split('/').filter(Boolean);
            const last = parts.pop();
            if (last && last !== 'product' && last !== 'index') {
                urlSlug = last.replace('.html', '');
            }
        }

        for (const container of Array.from(containers)) {
            const slug = container.getAttribute('data-product-slug') || container.getAttribute('data-product-scope') || urlSlug;
            if (!slug) continue;

            try {
                container.classList.add('ce-is-updating');
                const data = await api(`/ public / products / ${slug} `);
                const product = data.product;

                fillProductFields(container, product);

                const addBtn = container.querySelector('[data-commerce="add-to-cart"]');
                if (addBtn) {
                    if (!addBtn.__detailBound) {
                        addBtn.__detailBound = true;
                        addBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const selectedVariant = container.querySelector('[data-commerce="variant-select"]');
                            const variantId = selectedVariant ? selectedVariant.value : null;
                            const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
                            const price = variant ? variant.price : product.price;
                            const salePrice = variant ? variant.salePrice : product.salePrice;
                            addToCart(product.id, variantId, product.title, price, product.imageUrl, 1, salePrice);
                        });
                    }
                }

                const variantContainer = container.querySelector('[data-commerce="variants"], [data-commerce="variant-selector"]');
                if (variantContainer && product.variants.length > 0) {
                    renderVariants(variantContainer, product);
                }

                // Render reviews section
                const reviewsContainer = container.querySelector('[data-commerce="reviews"]');
                if (reviewsContainer && product.reviews) {
                    renderReviews(reviewsContainer, product.reviews);
                }

                container.classList.remove('ce-is-updating');
                document.dispatchEvent(new CustomEvent('ce-product-loaded', { detail: { product, container } }));

            } catch (error) {
                console.error('[CommerceEngine] Failed to load product:', error);
                container.classList.remove('ce-is-updating');
            }
        }
    }

    function fillProductFields(element, product) {
        const fields = element.querySelectorAll('[data-field]');
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            switch (fieldName) {
                case 'title':
                    field.textContent = product.title;
                    break;
                case 'price':
                    if (product.onSale) {
                        field.innerHTML = `< span class="wfc-original-price" > ${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)}</span > <span class="wfc-sale-price">${CURRENCY_SYMBOL}${parseFloat(product.salePrice).toFixed(2)}</span>`;
                    } else {
                        field.textContent = `${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)} `;
                    }
                    break;
                case 'sale-price':
                    if (product.onSale) {
                        field.textContent = `${CURRENCY_SYMBOL}${parseFloat(product.salePrice).toFixed(2)} `;
                        field.style.display = '';
                    } else {
                        field.style.display = 'none';
                    }
                    break;
                case 'compare-price':
                    if (product.onSale) {
                        field.textContent = `${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)} `;
                        field.style.display = '';
                    } else {
                        field.style.display = 'none';
                    }
                    break;
                case 'description':
                    field.innerHTML = product.description || '';
                    break;
                case 'short-description':
                    field.innerHTML = product.shortDescription || '';
                    break;
                case 'image':
                    if (product.imageUrl) {
                        if (field.tagName === 'IMG') { field.src = product.imageUrl; field.alt = product.title; }
                        else { field.style.backgroundImage = `url(${product.imageUrl})`; }
                    }
                    break;
                case 'gallery':
                    if (product.galleryImages && product.galleryImages.length > 0) {
                        field.innerHTML = product.galleryImages.map(url => `< img src = "${url}" alt = "${product.title}" class="wfc-gallery-img" > `).join('');
                    }
                    break;
                case 'category':
                    if (product.categories && product.categories.length > 0) {
                        field.innerHTML = product.categories.map(c => `< span class="wfc-category-tag" > ${c.name}</span > `).join('');
                    }
                    break;
                case 'rating':
                    if (product.rating) {
                        const full = Math.floor(product.rating);
                        const half = product.rating % 1 >= 0.5 ? 1 : 0;
                        const empty = 5 - full - half;
                        field.innerHTML = '<span class="wfc-stars">' +
                            '<span class="wfc-star-full">&#9733;</span>'.repeat(full) +
                            (half ? '<span class="wfc-star-half">&#9733;</span>' : '') +
                            '<span class="wfc-star-empty">&#9734;</span>'.repeat(empty) +
                            `</span > <span class="wfc-review-count">(${product.reviewCount || 0})</span>`;
                    }
                    break;
                case 'badge':
                    if (!product.inStock) {
                        field.innerHTML = '<span class="wfc-badge wfc-badge-soldout">Sold Out</span>';
                    } else if (product.onSale) {
                        const pct = Math.round((1 - product.salePrice / product.price) * 100);
                        field.innerHTML = `< span class="wfc-badge wfc-badge-sale" > -${pct}%</span > `;
                    } else if (product.isFeatured) {
                        field.innerHTML = '<span class="wfc-badge wfc-badge-featured">Featured</span>';
                    } else {
                        field.innerHTML = '';
                    }
                    break;
                case 'stock-status':
                    field.textContent = product.inStock ? (product.stockStatus === 'onbackorder' ? 'On Backorder' : 'In Stock') : 'Out of Stock';
                    field.className = product.inStock ? 'wfc-in-stock' : 'wfc-out-of-stock';
                    break;
                case 'sku':
                    field.textContent = product.sku || '';
                    break;
            }
        });
    }

    function renderVariants(container, product) {
        // Extract unique attribute groups from all variants
        const attrGroups = {};
        product.variants.forEach(v => {
            if (v.attributes && typeof v.attributes === 'object') {
                Object.entries(v.attributes).forEach(([key, value]) => {
                    if (!attrGroups[key]) attrGroups[key] = new Set();
                    attrGroups[key].add(value);
                });
            }
        });

        if (Object.keys(attrGroups).length === 0) return;

        // Track selected attributes
        const selectedAttrs = {};
        let currentVariant = null;

        // Create or find hidden variant select input
        let variantSelect = container.closest('[data-commerce="product-detail"]')?.querySelector('[data-commerce="variant-select"]');
        if (!variantSelect) {
            variantSelect = document.createElement('input');
            variantSelect.type = 'hidden';
            variantSelect.setAttribute('data-commerce', 'variant-select');
            container.appendChild(variantSelect);
        }

        // Build UI
        let html = '';
        Object.entries(attrGroups).forEach(([key, values]) => {
            const isColor = key.toLowerCase().includes('color') || key.toLowerCase().includes('colour');
            html += `< div class="wfc-variant-group" >
                <label class="wfc-variant-label">${key}</label>
                <div class="wfc-variant-options">
                    ${[...values].map(v => {
                if (isColor) {
                    return `<button class="wfc-variant-btn wfc-color-btn" data-attr-key="${key}" data-attr-value="${v}" style="background:${v.toLowerCase()}" title="${v}"></button>`;
                }
                return `<button class="wfc-variant-btn" data-attr-key="${key}" data-attr-value="${v}">${v}</button>`;
            }).join('')}
                </div>
            </div > `;
        });

        // Selected variant info area
        html += '<div class="wfc-variant-info" data-ce-variant-info="true"></div>';
        container.innerHTML = html;

        // Find matching variant for current selection
        function findMatchingVariant() {
            const attrKeys = Object.keys(attrGroups);
            if (Object.keys(selectedAttrs).length !== attrKeys.length) return null;

            return product.variants.find(v => {
                if (!v.attributes || !v.isActive) return false;
                return attrKeys.every(key => v.attributes[key] === selectedAttrs[key]);
            });
        }

        // Update the product page based on selected variant
        function updateVariantDisplay() {
            currentVariant = findMatchingVariant();
            const detail = container.closest('[data-commerce="product-detail"]') || container.closest('[data-product-scope]');
            const infoEl = container.querySelector('[data-ce-variant-info="true"]');

            if (currentVariant) {
                variantSelect.value = currentVariant.id;

                // Update price display
                const priceEl = detail?.querySelector('[data-field="price"]');
                if (priceEl) {
                    const vPrice = parseFloat(currentVariant.price);
                    const vSale = currentVariant.salePrice ? parseFloat(currentVariant.salePrice) : null;
                    if (vSale && vSale < vPrice) {
                        priceEl.innerHTML = `< span class="wfc-original-price" > ${CURRENCY_SYMBOL}${vPrice.toFixed(2)}</span > <span class="wfc-sale-price">${CURRENCY_SYMBOL}${vSale.toFixed(2)}</span>`;
                    } else {
                        priceEl.textContent = `${CURRENCY_SYMBOL}${vPrice.toFixed(2)} `;
                    }
                }

                // Update image
                const imgEl = detail?.querySelector('[data-field="image"]');
                if (imgEl) {
                    imgEl.classList.add('ce-is-updating');
                    if (imgEl.tagName === 'IMG') {
                        imgEl.src = currentVariant.imageUrl || product.imageUrl;
                    } else {
                        imgEl.style.backgroundImage = `url(${currentVariant.imageUrl || product.imageUrl})`;
                    }
                    setTimeout(() => imgEl.classList.remove('ce-is-updating'), 300);
                }

                // Update stock display
                const stockEl = detail?.querySelector('[data-field="stock-status"]');
                if (stockEl) {
                    const inStock = currentVariant.stockStatus !== 'outofstock' && (currentVariant.manageStock ? currentVariant.stockQuantity > 0 : true);
                    stockEl.textContent = inStock ? 'In Stock' : 'Out of Stock';
                    stockEl.className = inStock ? 'wfc-in-stock' : 'wfc-out-of-stock';
                }

                // Update SKU
                const skuEl = detail?.querySelector('[data-field="sku"]');
                if (skuEl && currentVariant.sku) skuEl.textContent = currentVariant.sku;

                // Show variant info
                if (infoEl) {
                    const label = Object.values(selectedAttrs).join(' / ');
                    const vPrice = currentVariant.salePrice ? parseFloat(currentVariant.salePrice) : parseFloat(currentVariant.price);
                    infoEl.innerHTML = `< span class="wfc-variant-selected" > ${label}</span > <span class="wfc-variant-price">${CURRENCY_SYMBOL}${vPrice.toFixed(2)}</span>`;
                    infoEl.style.display = 'flex';
                }

                // Enable add to cart
                const addBtn = detail?.querySelector('[data-commerce="add-to-cart"]');
                if (addBtn) { addBtn.disabled = false; addBtn.style.opacity = '1'; }

                // Dispatch events for custom animations/interactions
                document.dispatchEvent(new CustomEvent('ce-variant-changed', {
                    detail: { product, variant: currentVariant, container: detail, imageElement: imgEl }
                }));

            } else {
                variantSelect.value = '';
                if (infoEl) {
                    const remaining = Object.keys(attrGroups).filter(k => !selectedAttrs[k]);
                    infoEl.innerHTML = remaining.length > 0 ? `< span class="wfc-variant-hint" > Select ${remaining.join(', ')}</span > ` : '';
                    infoEl.style.display = remaining.length > 0 ? 'flex' : 'none';
                }

                const imgEl = detail?.querySelector('[data-field="image"]');
                if (imgEl) {
                    imgEl.classList.add('ce-is-updating');
                    if (imgEl.tagName === 'IMG') {
                        imgEl.src = product.imageUrl;
                    } else {
                        imgEl.style.backgroundImage = `url(${product.imageUrl})`;
                    }
                    setTimeout(() => imgEl.classList.remove('ce-is-updating'), 300);
                }

                document.dispatchEvent(new CustomEvent('ce-variant-changed', {
                    detail: { product, variant: null, container: detail, imageElement: imgEl }
                }));
            }
        }

        // Bind attribute button clicks
        container.querySelectorAll('.wfc-variant-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-attr-key');
                const value = btn.getAttribute('data-attr-value');

                // Toggle selection
                if (selectedAttrs[key] === value) {
                    delete selectedAttrs[key];
                    btn.classList.remove('active');
                } else {
                    selectedAttrs[key] = value;
                    // Deselect other buttons in same group
                    container.querySelectorAll(`.wfc - variant - btn[data - attr - key="${key}"]`).forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }

                updateVariantDisplay();
            });
        });

        // Disable add-to-cart until variant selected (if product has variants)
        const detail = container.closest('[data-commerce="product-detail"]');
        const addBtn = detail?.querySelector('[data-commerce="add-to-cart"]');
        if (addBtn && product.variants.length > 0) {
            addBtn.disabled = true;
            addBtn.style.opacity = '0.5';
        }

        // Override add-to-cart to include variant label
        if (addBtn && !addBtn.__variantBound) {
            addBtn.__variantBound = true;
            const originalClick = addBtn.onclick;
            addBtn.addEventListener('click', (e) => {
                if (currentVariant) {
                    e.preventDefault();
                    e.stopPropagation();
                    const label = Object.values(selectedAttrs).join(' / ');
                    const vPrice = parseFloat(currentVariant.price);
                    const vSale = currentVariant.salePrice ? parseFloat(currentVariant.salePrice) : null;
                    const imgUrl = currentVariant.imageUrl || product.imageUrl;

                    // NEW QUANTITY LOGIC
                    let quantity = 1;
                    const qtyId = addBtn.getAttribute('data-qty-id');
                    if (qtyId) {
                        const qtyInput = document.getElementById(qtyId);
                        if (qtyInput) {
                            quantity = parseInt(qtyInput.value) || 1;
                        }
                    } else {
                        const qtyParentInput = detail.querySelector('[data-commerce="quantity-input"]');
                        if (qtyParentInput) {
                            quantity = parseInt(qtyParentInput.value) || 1;
                        }
                    }

                    addToCart(product.id, currentVariant.id, product.title, vPrice, imgUrl, quantity, vSale);
                    // Inject variant label into last cart item
                    const cart = getCart();
                    const lastItem = cart.items[cart.items.length - 1];
                    if (lastItem) lastItem.variantLabel = label;
                    saveCart(cart);
                } else if (product.variants.length > 0) {
                    e.preventDefault();
                    showToast('Please select all options');
                }
            }, true);
        }
    }

    function renderReviews(container, reviews) {
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p class="wfc-no-reviews">No reviews yet.</p>';
            return;
        }
        container.innerHTML = reviews.map(r => `
            < div class="wfc-review" >
                <div class="wfc-review-header">
                    <span class="wfc-stars">${'<span class="wfc-star-full">&#9733;</span>'.repeat(r.rating)}${'<span class="wfc-star-empty">&#9734;</span>'.repeat(5 - r.rating)}</span>
                    <strong>${r.author || 'Anonymous'}</strong>
                    <span class="wfc-review-date">${new Date(r.date).toLocaleDateString()}</span>
                </div>
        ${r.title ? `<div class="wfc-review-title">${r.title}</div>` : ''}
        <p class="wfc-review-content">${r.content || ''}</p>
      </div >
            `).join('');
    }

    // --- Checkout ---
    async function checkout() {
        const cart = getCart();
        if (cart.items.length === 0) { showToast('Your cart is empty'); return; }

        const checkoutBtn = document.querySelector('[data-commerce="checkout-btn"], .wfc-checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.setAttribute('data-original-text', checkoutBtn.textContent);
            checkoutBtn.textContent = 'Processing...';
            checkoutBtn.disabled = true;
        }

        try {
            const body = {
                items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }))
            };

            // Include coupon
            const coupon = getAppliedCoupon();
            if (coupon && coupon.valid) body.couponCode = coupon.code;

            // Include customer
            const customerToken = getCustomerToken();
            if (customerToken) body.customerToken = customerToken;

            const customer = getCustomer();
            if (customer?.email) body.customerEmail = customer.email;

            const data = await api('/checkout/create-session', { method: 'POST', body });

            if (data.url) {
                localStorage.removeItem(CART_KEY);
                clearAppliedCoupon();
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('[CommerceEngine] Checkout failed:', error);
            showToast('Checkout failed: ' + error.message);
            if (checkoutBtn) { checkoutBtn.textContent = 'Checkout'; checkoutBtn.disabled = false; }
        }
    }

    // --- Wishlist ---
    function getLocalWishlist() {
        try { return JSON.parse(localStorage.getItem('wfc_wishlist') || '[]'); } catch { return []; }
    }

    function saveLocalWishlist(list) {
        localStorage.setItem('wfc_wishlist', JSON.stringify(list));
    }

    async function toggleWishlist(productId) {
        const token = getCustomerToken();
        if (token) {
            // API wishlist
            try {
                const items = getLocalWishlist();
                const isInWishlist = items.includes(productId);
                if (isInWishlist) {
                    await api(`/ customer / wishlist / ${productId} `, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token} ` } });
                    saveLocalWishlist(items.filter(id => id !== productId));
                    showToast('Removed from wishlist');
                } else {
                    await api('/customer/wishlist', { method: 'POST', headers: { 'Authorization': `Bearer ${token} ` }, body: { productId } });
                    items.push(productId);
                    saveLocalWishlist(items);
                    showToast('Added to wishlist');
                }
            } catch (e) {
                showToast('Wishlist error: ' + e.message);
            }
        } else {
            // Local wishlist (guest)
            const items = getLocalWishlist();
            const idx = items.indexOf(productId);
            if (idx > -1) {
                items.splice(idx, 1);
                showToast('Removed from wishlist');
            } else {
                items.push(productId);
                showToast('Added to wishlist');
            }
            saveLocalWishlist(items);
        }
        updateWishlistIcons();
    }

    function updateWishlistIcons() {
        const items = getLocalWishlist();
        document.querySelectorAll('[data-commerce="wishlist-toggle"]').forEach(btn => {
            const pid = btn.getAttribute('data-product-id');
            const isWished = items.includes(pid);
            btn.classList.toggle('wfc-wishlisted', isWished);
            btn.innerHTML = isWished ? '&#9829;' : '&#9825;';
        });
    }

    // Sync wishlist from API on login
    async function syncWishlist() {
        const token = getCustomerToken();
        if (!token) return;
        try {
            const data = await api('/customer/wishlist', { headers: { 'Authorization': `Bearer ${token} ` } });
            if (data.wishlist) {
                const ids = data.wishlist.map(item => item.productId);
                saveLocalWishlist(ids);
                updateWishlistIcons();
            }
        } catch (e) {
            console.log('[CommerceEngine] Wishlist sync skipped:', e.message);
        }
    }

    // --- Search ---
    let searchTimeout = null;

    function initSearch() {
        const containers = document.querySelectorAll('[data-commerce="search"]');
        if (containers.length === 0) return;

        containers.forEach(container => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Search products...';
            input.className = 'wfc-search-input';

            const results = document.createElement('div');
            results.className = 'wfc-search-results';

            container.style.position = 'relative';
            container.appendChild(input);
            container.appendChild(results);

            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const q = input.value.trim();
                if (q.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }

                searchTimeout = setTimeout(async () => {
                    try {
                        const data = await api(`/ public / search ? q = ${encodeURIComponent(q)} `);
                        if (data.results.length === 0) {
                            results.innerHTML = '<div class="wfc-search-empty">No products found</div>';
                        } else {
                            results.innerHTML = data.results.map(p => {
                                const price = p.salePrice
                                    ? `< span class="wfc-original-price" > ${CURRENCY_SYMBOL}${p.price.toFixed(2)}</span > ${CURRENCY_SYMBOL}${p.salePrice.toFixed(2)} `
                                    : `${CURRENCY_SYMBOL}${p.price.toFixed(2)} `;
                                return `< a href = "/product/${p.slug}" class="wfc-search-item" >
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="wfc-search-img">` : '<div class="wfc-search-img wfc-placeholder"></div>'}
        <div class="wfc-search-info">
            <div class="wfc-search-title">${p.title}</div>
            <div class="wfc-search-price">${price}</div>
        </div>
                                </a > `;
                            }).join('');
                        }
                        results.style.display = 'block';
                    } catch (e) {
                        results.innerHTML = '';
                        results.style.display = 'none';
                    }
                }, 300);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    results.style.display = 'none';
                }
            });

            input.addEventListener('focus', () => {
                if (results.innerHTML) results.style.display = 'block';
            });
        });
    }

    // --- Event Binding ---
    function bindButtons() {
        document.querySelectorAll('[data-commerce="add-to-cart"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.getAttribute('data-product-id');
                if (!productId) return;
                const parent = btn.closest('[data-product-id]') || btn;
                const title = parent.querySelector('[data-field="title"]')?.textContent || 'Product';
                const priceText = parent.querySelector('[data-field="price"]')?.textContent || '0';
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                const imageEl = parent.querySelector('[data-field="image"]');
                const imageUrl = imageEl ? (imageEl.src || '') : '';

                // NEW QUANTITY LOGIC for standard buttons
                let quantity = 1;
                const qtyId = btn.getAttribute('data-qty-id');
                if (qtyId) {
                    const qtyInput = document.getElementById(qtyId);
                    if (qtyInput) {
                        quantity = parseInt(qtyInput.value) || 1;
                    }
                } else {
                    const qtyParentInput = parent.querySelector('[data-commerce="quantity-input"]');
                    if (qtyParentInput) {
                        quantity = parseInt(qtyParentInput.value) || 1;
                    }
                }

                addToCart(productId, null, title, price, imageUrl, quantity);
            });
        });

        document.querySelectorAll('[data-commerce="cart-toggle"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); showCart(); });
        });

        document.querySelectorAll('[data-commerce="checkout-btn"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); checkout(); });
        });

        // Customer login buttons
        document.querySelectorAll('[data-commerce="customer-login"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); showAuthModal('login'); });
        });

        // Account link (for logged-in users)
        document.querySelectorAll('[data-commerce="account-link"]').forEach(el => {
            if (el.__commerceBound) return;
            el.__commerceBound = true;
            // Add a dropdown or simple logout on click
            el.addEventListener('click', (e) => { e.preventDefault(); logout(); });
        });

        // Wishlist toggle buttons
        document.querySelectorAll('[data-commerce="wishlist-toggle"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = btn.getAttribute('data-product-id');
                if (productId) toggleWishlist(productId);
            });
        });
    }

    // --- Styles ---
    function getCartStyles() {
        return `
        #wf - commerce - cart { display: none; }
        #wf - commerce - cart.wfc - open { display: block; }
      
      .wfc - overlay {
            position: fixed; top: 0; left: 0; width: 100 %; height: 100 %;
            background: rgba(0, 0, 0, 0.5); z - index: 99998; cursor: pointer;
            animation: wfcFadeIn 0.2s ease;
        }
      
      .wfc - sidebar {
            position: fixed; top: 0; right: 0; width: 420px; max - width: 90vw; height: 100 %;
            background: #fff; z - index: 99999; display: flex; flex - direction: column;
            box - shadow: -4px 0 20px rgba(0, 0, 0, 0.15); animation: wfcSlideIn 0.3s ease;
            font - family: -apple - system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans - serif;
        }
      
      .wfc - sidebar - header {
            display: flex; justify - content: space - between; align - items: center;
            padding: 20px 24px; border - bottom: 1px solid #eee;
        }
      .wfc - sidebar - header h3 { margin: 0; font - size: 18px; font - weight: 600; color: #111; }
      
      .wfc - close {
            background: none; border: none; font - size: 28px; cursor: pointer;
            color: #666; padding: 0; line - height: 1; transition: color 0.2s;
        }
      .wfc - close:hover { color: #111; }
      
      .wfc - sidebar - body { flex: 1; overflow - y: auto; padding: 16px 24px; }
      
      .wfc - cart - item {
            display: flex; gap: 12px; padding: 16px 0;
            border - bottom: 1px solid #f0f0f0; position: relative;
        }
      .wfc - item - img {
            width: 72px; height: 72px; object - fit: cover; border - radius: 8px;
            background: #f5f5f5; flex - shrink: 0;
        }
      .wfc - placeholder { background: linear - gradient(135deg, #f5f5f5, #eee); }
      .wfc - item - info { flex: 1; min - width: 0; }
      .wfc - item - title { font - weight: 500; font - size: 14px; color: #111; margin - bottom: 4px; }
      .wfc - item - price { font - size: 14px; color: #666; margin - bottom: 8px; }
      .wfc - original - price { text - decoration: line - through; color: #999; margin - right: 6px; font - size: 13px; }
      .wfc - sale - price { color: #e53e3e; font - weight: 600; }
      
      .wfc - item - qty {
            display: flex; align - items: center; gap: 0;
            border: 1px solid #ddd; border - radius: 6px; width: fit - content;
        }
      .wfc - item - qty button {
            background: none; border: none; width: 32px; height: 32px;
            cursor: pointer; font - size: 16px; color: #333; transition: background 0.2s;
        }
      .wfc - item - qty button:hover { background: #f5f5f5; }
      .wfc - item - qty span { width: 32px; text - align: center; font - size: 14px; font - weight: 500; }
      
      .wfc - remove {
            position: absolute; top: 16px; right: 0; background: none; border: none;
            color: #999; cursor: pointer; font - size: 18px; padding: 0;
        }
      .wfc - remove:hover { color: #e53e3e; }
      
      .wfc - empty - cart { text - align: center; padding: 60px 20px; color: #999; }
      
      .wfc - sidebar - footer { padding: 16px 24px; border - top: 1px solid #eee; background: #fafafa; }
      
      .wfc - coupon - row { display: flex; gap: 8px; margin - bottom: 12px; }
      .wfc - coupon - input {
            flex: 1; padding: 8px 12px; border: 1px solid #ddd; border - radius: 6px;
            font - size: 13px; text - transform: uppercase; outline: none;
        }
      .wfc - coupon - input:focus { border - color: #111; }
      .wfc - coupon - btn {
            padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border - radius: 6px;
            font - size: 13px; font - weight: 500; cursor: pointer; transition: all 0.2s;
        }
      .wfc - coupon - btn:hover { background: #eee; }
      .wfc - coupon - applied { margin - bottom: 12px; }
      .wfc - coupon - tag {
            display: inline - flex; align - items: center; gap: 6px; padding: 4px 10px;
            background: #e8f5e9; color: #2e7d32; border - radius: 4px; font - size: 13px; font - weight: 500;
        }
      .wfc - coupon - tag button {
            background: none; border: none; color: #2e7d32; cursor: pointer; font - size: 16px; padding: 0; line - height: 1;
        }
      
      .wfc - subtotal, .wfc - total, .wfc - discount - row {
            display: flex; justify - content: space - between; margin - bottom: 8px;
            font - size: 14px; color: #666;
        }
      .wfc - total { font - size: 16px; font - weight: 600; color: #111; margin - bottom: 16px; }
      .wfc - discount - amount { color: #2e7d32; font - weight: 500; }
      
      .wfc - checkout - btn {
            width: 100 %; padding: 14px; background: #111; color: #fff; border: none;
            border - radius: 8px; font - size: 15px; font - weight: 600; cursor: pointer;
            transition: all 0.2s;
        }
      .wfc - checkout - btn:hover { background: #333; transform: translateY(-1px); }
      .wfc - checkout - btn:disabled { background: #999; cursor: not - allowed; transform: none; }
      
      .wfc - toast {
            position: fixed; bottom: 24px; left: 50 %; transform: translateX(-50 %) translateY(100px);
            background: #111; color: #fff; padding: 12px 24px; border - radius: 8px;
            font - size: 14px; font - family: -apple - system, BlinkMacSystemFont, sans - serif;
            z - index: 100000; opacity: 0; transition: all 0.3s ease;
            box - shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      .wfc - toast - show { opacity: 1; transform: translateX(-50 %) translateY(0); }
      
      .wfc -in -stock { color: #38a169; font - weight: 500; }
      .wfc - out - of - stock { color: #e53e3e; font - weight: 500; }
      
      .wfc - variant - group { margin - bottom: 16px; }
      .wfc - variant - group label { display: block; font - weight: 500; margin - bottom: 8px; text - transform: capitalize; }
      .wfc - variant - options { display: flex; gap: 8px; flex - wrap: wrap; }
      .wfc - variant - btn {
            padding: 8px 16px; border: 1px solid #ddd; border - radius: 6px;
            background: #fff; cursor: pointer; font - size: 14px; transition: all 0.2s;
        }
      .wfc - variant - btn:hover { border - color: #111; }
      .wfc - variant - btn.active { background: #111; color: #fff; border - color: #111; }

      /* Color swatch variant buttons */
      .wfc - color - btn {
            width: 36px; height: 36px; padding: 0; border - radius: 50 %;
            border: 2px solid #ddd; position: relative;
        }
      .wfc - color - btn.active { border - color: #111; box - shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
      .wfc - color - btn:hover { border - color: #888; }

      /* Variant info display */
      .wfc - variant - info {
            display: none; justify - content: space - between; align - items: center;
            padding: 10px 14px; background: #f8fafc; border - radius: 6px;
            margin - top: 12px; font - size: 14px;
        }
      .wfc - variant - selected { font - weight: 600; color: #111; }
      .wfc - variant - price { font - weight: 600; color: #111; }
      .wfc - variant - hint { color: #999; font - style: italic; }
      .wfc - variant - label { font - weight: 500; margin - bottom: 8px; text - transform: capitalize; }

      /* Variant label in cart items */
      .wfc - item - variant { font - size: 12px; color: #888; margin - bottom: 4px; }

        /* Wishlist */
        [data - commerce="wishlist-toggle"] {
            background: none; border: none; cursor: pointer; font - size: 22px;
            color: #ccc; transition: all 0.2s; padding: 4px; line - height: 1;
        }
        [data - commerce="wishlist-toggle"]:hover { color: #e53e3e; transform: scale(1.1); }
        [data - commerce="wishlist-toggle"].wfc - wishlisted { color: #e53e3e; }

      /* Search */
      .wfc - search - input {
            width: 100 %; padding: 10px 14px; border: 1px solid #ddd; border - radius: 8px;
            font - size: 14px; outline: none; transition: border - color 0.2s;
            font - family: inherit;
        }
      .wfc - search - input:focus { border - color: #111; }
      .wfc - search - results {
            display: none; position: absolute; top: 100 %; left: 0; right: 0;
            background: #fff; border: 1px solid #ddd; border - radius: 8px;
            box - shadow: 0 8px 24px rgba(0, 0, 0, 0.12); z - index: 1000;
            max - height: 400px; overflow - y: auto; margin - top: 4px;
        }
      .wfc - search - item {
            display: flex; align - items: center; gap: 12px; padding: 10px 14px;
            text - decoration: none; color: inherit; transition: background 0.15s;
        }
      .wfc - search - item:hover { background: #f5f5f5; }
      .wfc - search - img { width: 48px; height: 48px; object - fit: cover; border - radius: 6px; flex - shrink: 0; background: #f5f5f5; }
      .wfc - search - info { flex: 1; min - width: 0; }
      .wfc - search - title { font - weight: 500; font - size: 14px; white - space: nowrap; overflow: hidden; text - overflow: ellipsis; }
      .wfc - search - price { font - size: 13px; color: #666; margin - top: 2px; }
      .wfc - search - empty { padding: 20px; text - align: center; color: #999; font - size: 14px; }

      /* Badges */
      .wfc - badge {
            display: inline - block; padding: 4px 10px; border - radius: 4px;
            font - size: 12px; font - weight: 600; text - transform: uppercase; letter - spacing: 0.5px;
        }
      .wfc - badge - sale { background: #fee2e2; color: #dc2626; }
      .wfc - badge - soldout { background: #e5e7eb; color: #6b7280; }
      .wfc - badge - featured { background: #fef3c7; color: #d97706; }

      /* Stars */
      .wfc - stars { display: inline - flex; gap: 1px; font - size: 16px; }
      .wfc - star - full { color: #f59e0b; }
      .wfc - star - half { color: #f59e0b; opacity: 0.6; }
      .wfc - star - empty { color: #d1d5db; }
      .wfc - review - count { margin - left: 6px; font - size: 13px; color: #6b7280; }

      /* Category filter */
      .wfc - category - list { display: flex; flex - direction: column; gap: 4px; }
      .wfc - cat - btn {
            display: flex; justify - content: space - between; align - items: center;
            width: 100 %; padding: 10px 14px; border: none; background: none;
            text - align: left; cursor: pointer; font - size: 14px; color: #444;
            border - radius: 6px; transition: all 0.2s;
        }
      .wfc - cat - btn:hover { background: #f5f5f5; color: #111; }
      .wfc - cat - btn.active { background: #111; color: #fff; font - weight: 500; }
      .wfc - cat - child { padding - left: 28px; font - size: 13px; }
      .wfc - cat - count { font - size: 12px; color: #999; font - weight: 400; }
      .wfc - cat - btn.active.wfc - cat - count { color: rgba(255, 255, 255, 0.7); }

      /* Category tags on products */
      .wfc - category - tag {
            display: inline - block; padding: 2px 8px; background: #f3f4f6; border - radius: 4px;
            font - size: 12px; color: #666; margin: 0 4px 4px 0;
        }

      /* Gallery */
      .wfc - gallery - img { width: 80px; height: 80px; object - fit: cover; border - radius: 6px; cursor: pointer; margin: 4px; border: 2px solid transparent; transition: border - color 0.2s; }
      .wfc - gallery - img:hover { border - color: #111; }

      /* Reviews */
      .wfc - review { padding: 16px 0; border - bottom: 1px solid #f0f0f0; }
      .wfc - review - header { display: flex; align - items: center; gap: 10px; margin - bottom: 6px; }
      .wfc - review - title { font - weight: 600; margin - bottom: 4px; }
      .wfc - review - content { color: #555; font - size: 14px; line - height: 1.5; margin: 0; }
      .wfc - review - date { color: #999; font - size: 12px; }
      .wfc - no - reviews { color: #999; text - align: center; padding: 20px; }

      /* Auth Modal */
      .wfc - auth - modal { display: none; }
      .wfc - auth - modal.wfc - open { display: block; }
      .wfc - auth - overlay {
            position: fixed; top: 0; left: 0; width: 100 %; height: 100 %;
            background: rgba(0, 0, 0, 0.5); z - index: 99998; cursor: pointer;
        }
      .wfc - auth - box {
            position: fixed; top: 50 %; left: 50 %; transform: translate(-50 %, -50 %);
            background: #fff; border - radius: 12px; padding: 32px; width: 380px; max - width: 90vw;
            z - index: 99999; box - shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            animation: wfcFadeIn 0.2s ease;
        }
      .wfc - auth - tabs { display: flex; gap: 0; margin - bottom: 24px; border - bottom: 2px solid #f0f0f0; }
      .wfc - auth - tab {
            flex: 1; padding: 10px; border: none; background: none; cursor: pointer;
            font - size: 15px; font - weight: 500; color: #999; transition: all 0.2s;
            border - bottom: 2px solid transparent; margin - bottom: -2px;
        }
      .wfc - auth - tab.active { color: #111; border - bottom - color: #111; }
      .wfc - auth - input {
            width: 100 %; padding: 12px 14px; border: 1px solid #ddd; border - radius: 8px;
            font - size: 14px; margin - bottom: 12px; outline: none; transition: border - color 0.2s;
            box - sizing: border - box;
        }
      .wfc - auth - input:focus { border - color: #111; }
      .wfc - auth - error { color: #e53e3e; font - size: 13px; margin - bottom: 12px; }
      .wfc - auth - submit {
            width: 100 %; padding: 14px; background: #111; color: #fff; border: none;
            border - radius: 8px; font - size: 15px; font - weight: 600; cursor: pointer;
            transition: all 0.2s;
        }
      .wfc - auth - submit:hover { background: #333; }
      .wfc - auth - submit:disabled { background: #999; cursor: not - allowed; }

        @keyframes wfcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wfcSlideIn { from { transform: translateX(100 %); } to { transform: translateX(0); } }

        @media(max - width: 480px) {
        .wfc - sidebar { width: 100 %; }
        .wfc - auth - box { width: 90vw; padding: 24px; }
        }
        `;
    }

    // --- Initialize ---
    function init() {
        createCartSidebar();
        bindButtons();
        updateCartBadges();
        renderCartUI();
        renderProductList();
        renderProductDetail();
        renderCategoryFilter();
        updateAccountUI();
        initSearch();
        updateWishlistIcons();
        syncWishlist();
    }

    // Expose global API
    window.__commerceEngine = {
        addToCart,
        removeItem: removeFromCart,
        updateQty: updateQuantity,
        showCart,
        hideCart,
        checkout,
        getCart,
        getCartCount,
        getCartTotal,
        api,
        applyCoupon,
        removeCoupon,
        showAuthModal,
        closeAuth,
        switchAuth,
        submitAuth,
        logout,
        toggleWishlist,
        getWishlist: getLocalWishlist,
        refresh: () => {
            bindButtons();
            renderProductList();
            renderProductDetail();
            renderCategoryFilter();
            updateAccountUI();
            updateWishlistIcons();
        }
    };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
