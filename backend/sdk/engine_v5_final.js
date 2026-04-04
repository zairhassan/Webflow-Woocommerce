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
 * - data-commerce="account-page"      -> Full Customer Portal / Account Hub (Dashboard)
 *   Attributes: data-layout, data-skin, data-hide, data-primary-color, data-accent-color
 * - data-field="title|price|sale-price|image|description|category|rating|badge|stock-status|sku"
 */

(function () {
    if (window.__ce_injected) {
        console.log('[CommerceEngine] Already injected, skipping duplicate init.');
        return;
    }
    window.__ce_injected = true;

    'use strict';

    window.onerror = function (msg, url, lineNo, columnNo, error) {
        console.error(`[CRITICAL ERROR] ${msg}\nLine: ${lineNo}\nURL: ${url}`);
        return false;
    };

    console.log("[CommerceEngine] Script Executing...");
    // alert("SDK LOADING...");

    // --- Configuration ---
    const SCRIPT_ID = 'ce-engine-script';
    const SCRIPT_TAG = document.getElementById(SCRIPT_ID) || document.currentScript || Array.from(document.querySelectorAll('script')).find(s => s.src.includes('engine.js'));

    let STORE_KEY = SCRIPT_TAG?.getAttribute('data-store-key') || localStorage.getItem('ce_persistent_store_key');
    let API_BASE = SCRIPT_TAG?.getAttribute('data-api-url') || localStorage.getItem('ce_persistent_api_url') || 'http://127.0.0.1:5001';

    API_BASE = API_BASE.replace(/\/$/, '');
    const CURRENCY_SYMBOL = SCRIPT_TAG?.getAttribute('data-currency') || '$';

    if (STORE_KEY) localStorage.setItem('ce_persistent_store_key', STORE_KEY);
    if (API_BASE) localStorage.setItem('ce_persistent_api_url', API_BASE);

    // Fallback for API_BASE as well
    if (API_BASE && API_BASE !== 'http://127.0.0.1:5001' && API_BASE !== 'http://localhost:5001') {
        localStorage.setItem('ce_persistent_api_base', API_BASE);
    } else if (!API_BASE || API_BASE.includes('127.0.0.1') || API_BASE.includes('localhost')) {
        const savedApi = localStorage.getItem('ce_persistent_api_base');
        if (savedApi) API_BASE = savedApi;
    }

    const CART_KEY = `wf_cart_${STORE_KEY}`;
    const CUSTOMER_KEY = `commerce_token`;
    const COUPON_KEY = `wf_coupon_${STORE_KEY}`;
    console.log("[CommerceEngine] Initialized with:", { STORE_KEY, API_BASE, CART_KEY });

    // Safe Storage Wrapper
    const safeStorage = {
        getItem: (key) => {
            try { return window.localStorage ? localStorage.getItem(key) : null; } catch (e) { return null; }
        },
        setItem: (key, val) => {
            try { if (window.localStorage) localStorage.setItem(key, val); } catch (e) { }
        },
        removeItem: (key) => {
            try { if (window.localStorage) localStorage.removeItem(key); } catch (e) { }
        }
    };

    // Global Error Handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[CommerceEngine] Unhandled Rejection:', event.reason);
    });

    // Expose global API early and comprehensively
    window.AuraEngine = window.__commerceEngine = {
        config: {
            apiBase: API_BASE,
            storeKey: STORE_KEY,
            currencySymbol: CURRENCY_SYMBOL
        },
        init: (...args) => init(...args),
        api: (...args) => api(...args),
        addToCart: (...args) => addToCart(...args),
        clearCart: (...args) => clearCart(...args),
        removeItem: (...args) => removeFromCart(...args),
        updateQty: (...args) => updateQuantity(...args),
        showCart: (...args) => showCart(...args),
        hideCart: (...args) => hideCart(...args),
        checkout: (...args) => checkout(...args),
        mountStripeElements: (...args) => mountStripeElements(...args),
        processOnSiteCheckout: (...args) => processOnSiteCheckout(...args),
        getCart: (...args) => getCart(...args),
        getCartCount: (...args) => getCartCount(...args),
        getCartTotal: (...args) => getCartTotal(...args),
        applyCoupon: (...args) => applyCoupon(...args),
        removeCoupon: (...args) => removeCoupon(...args),
        showAuthModal: (...args) => showAuthModal(...args),
        closeAuth: (...args) => closeAuth(...args),
        switchAuth: (...args) => switchAuth(...args),
        submitAuth: (...args) => submitAuth(...args),
        logout: (...args) => logout(...args),
        toggleCart: (...args) => toggleCart(...args),
        toggleWishlist: (...args) => toggleWishlist(...args),
        getWishlist: (...args) => getLocalWishlist(...args),
        getWishlistMap: () => getWishlistMap(),
        saveWishlistMap: (map) => saveWishlistMap(map),
        syncWishlist: () => syncWishlist(),
        getCustomerToken: () => getCustomerToken(),
        getImageUrl: (url) => getImageUrl(url),
        getAppliedCoupon: () => getAppliedCoupon(),
        renderCartUI: (...args) => renderCartUI(...args),
        renderProductList: (...args) => renderProductList(...args),
        trackViewedProduct: (...args) => trackViewedProduct(...args),
        getCurrencySymbol: () => CURRENCY_SYMBOL,
        isLoggedIn: () => isLoggedIn(),
        bindButtons: (scope) => bindButtons(scope),
        updateWishlistIcons: () => updateWishlistIcons(),
        renderPaymentGateways: (container) => renderPaymentGateways(container),
        // Customer Profile
        updateProfile: (data) => api('/customer/profile', { method: 'PUT', body: data }),
        changePassword: (oldP, newP) => api('/customer/profile/password', { method: 'PUT', body: { currentPassword: oldP, newPassword: newP } }),
        // Address Management
        getAddresses: () => api('/customer/addresses'),
        saveAddress: (data) => data.id ? api(`/customer/addresses/${data.id}`, { method: 'PUT', body: data }) : api('/customer/addresses', { method: 'POST', body: data }),
        deleteAddress: (id) => api(`/customer/addresses/${id}`, { method: 'DELETE' }),
        addAddress: (data) => api('/customer/addresses', { method: 'POST', body: data }),
        updateAddress: (id, data) => api(`/customer/addresses/${id}`, { method: 'PUT', body: data }),
        deleteAddress: (id) => api(`/customer/addresses/${id}`, { method: 'DELETE' }),
        // Orders
        getOrders: (params) => api('/customer/orders' + (params ? `?${new URLSearchParams(params)}` : '')),
        getCustomer: () => getCustomer(),
        submitReview: (data) => api('/customer/reviews', { method: 'POST', body: data }),
        renderReviewForm: (...args) => renderReviewForm(...args),
        renderProductDetail: (...args) => renderProductDetail(...args),
        renderProductPage: (...args) => renderProductPage(...args),
        renderWishlistPage: (...args) => renderWishlistPage(...args),
        renderShopPage: (...args) => renderShopPage(...args),
        refreshGrid: (el) => renderProductList(el),
        refresh: () => {
            bindButtons();
            renderProductList();
            renderProductDetail();
            renderProductPage();
            renderCategoryFilter();
            renderShopPage();
            updateAccountUI();
            updateWishlistIcons();
            renderAccountHub(); 
            document.querySelectorAll('[data-commerce="review-form"]').forEach(el => {
                const pid = el.getAttribute('data-product-id') || el.closest('[data-product-id]')?.getAttribute('data-product-id');
                if (pid) renderReviewForm(el, pid);
            });
            if (typeof renderWishlistPage === 'function') renderWishlistPage();
        },
        showAddressForm: (id) => {
            const modal = document.getElementById('ce-address-modal');
            const form = document.getElementById('ce-address-form');
            const title = document.getElementById('ce-address-form-title');
            if (!modal || !form) return;
            
            form.reset();
            document.getElementById('ce-addr-id').value = '';
            title.innerText = 'Add New Address';

            if (id) {
                title.innerText = 'Edit Address';
                // Find address from current state (we can store it on window or fetch again)
                // For simplicity, we'll fetch all addresses and find the one
                AuraEngine.getAddresses().then(res => {
                    const addr = res.addresses.find(a => a.id === id);
                    if (addr) {
                        document.getElementById('ce-addr-id').value = addr.id;
                        document.getElementById('ce-addr-fn').value = addr.firstName || '';
                        document.getElementById('ce-addr-ln').value = addr.lastName || '';
                        document.getElementById('ce-addr-a1').value = addr.address1 || '';
                        document.getElementById('ce-addr-city').value = addr.city || '';
                        document.getElementById('ce-addr-zip').value = addr.postcode || '';
                        document.getElementById('ce-addr-country').value = addr.country || 'United States';
                        document.getElementById('ce-addr-phone').value = addr.phone || '';
                        document.getElementById('ce-addr-default').checked = addr.isDefault || false;
                    }
                });
            }
            modal.style.display = 'flex';
        },
        hideAddressForm: () => {
            const modal = document.getElementById('ce-address-modal');
            if (modal) modal.style.display = 'none';
        },
        deleteAddress: async (id) => {
            if (!confirm('Are you sure you want to delete this address?')) return;
            try {
                await api(`/customer/addresses/${id}`, { method: 'DELETE' });
                showToast('Address deleted');
                AuraEngine.refresh();
            } catch (err) {
                showToast(err.message || 'Failed to delete address', 'error');
            }
        }
    };

    // --- Theme Synchronization ---
    const THEMES = {
        orange: {
            hex: '#F27D26',
            glow: 'rgba(242, 125, 38, 0.15)',
            dark: '#F27D26',
            grad: 'radial-gradient(circle at 50% 50%, #F27D26 0%, #A34500 100%)'
        },
        olive: {
            hex: '#5A5A40',
            glow: 'rgba(90, 90, 64, 0.15)',
            dark: '#5A5A40',
            grad: 'radial-gradient(circle at 50% 50%, #5A5A40 0%, #2A2A1A 100%)'
        },
        purple: {
            hex: '#7B61FF',
            glow: 'rgba(123, 97, 255, 0.15)',
            dark: '#7B61FF',
            grad: 'radial-gradient(circle at 50% 50%, #7B61FF 0%, #3B217F 100%)'
        }
    };

    function syncTheme() {
        try {
            const activeKey = safeStorage.getItem('aura_active_theme_key') || 'orange';
            const theme = THEMES[activeKey];
            if (!theme) return;

            document.documentElement.style.setProperty('--aura-theme', theme.hex);
            document.documentElement.style.setProperty('--aura-glow', theme.glow);
            document.documentElement.style.setProperty('--aura-grad', theme.grad);
            document.documentElement.style.setProperty('--aura-bg', theme.dark);

            const applyToDynamic = () => {
                // Bug Fix #5: Use CSS custom properties only, no inline !important overrides
                // Developers can style buttons via --aura-theme CSS variable
            };
            applyToDynamic();
        } catch (e) {
            console.warn('[CommerceEngine] syncTheme failed:', e);
        }
    }

    // Run sync
    syncTheme();
    window.addEventListener('storage', (e) => {
        if (e.key === 'aura_active_theme_key') syncTheme();
    });

    // Expose utility to window
    window.__ce_syncTheme = syncTheme;

    // Listen to variant changes globally to sync theme
    document.addEventListener('ce-variant-changed', (e) => {
        const variant = e.detail?.variant;
        if (!variant) return;

        let colorKey = '';
        const attributes = variant.attributes || {};
        const colorAttr = attributes.Color || attributes.color || attributes.Colour || attributes.colour || '';
        const colorVal = String(colorAttr).toLowerCase();

        if (colorVal.includes('olive') || colorVal.includes('green')) colorKey = 'olive';
        else if (colorVal.includes('purple')) colorKey = 'purple';
        else if (colorVal.includes('orange') || colorVal.includes('amber')) colorKey = 'orange';

        if (colorKey) {
            localStorage.setItem('aura_active_theme_key', colorKey);
            syncTheme();
        }
    });

    if (!STORE_KEY || !API_BASE) {
        const msg = `[CommerceEngine Error] Missing Config!\nStore Key: ${STORE_KEY}\nAPI Base: ${API_BASE}`;
        console.error(msg);
        return;
    }

    const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80';

    function getImageUrl(url) {
        if (!url || url.length === 0) return FALLBACK_IMAGE;
        if (typeof url !== 'string') return FALLBACK_IMAGE;
        if (url.startsWith('http')) return url;

        // Robust handling for local uploads
        let path = url;
        if (path.startsWith('/uploads/')) {
            // Path is already prefixed
        } else if (path.startsWith('uploads/')) {
            path = '/' + path;
        } else if (!path.startsWith('/') && !path.includes(':')) {
            path = '/uploads/' + path;
        }

        const finalUrl = API_BASE + path;
        console.log(`[CommerceEngine] Resolved image: ${url} -> ${finalUrl}`);
        return finalUrl;
    }

    
    function getCart() {
        const raw = safeStorage.getItem(CART_KEY);
        console.log('[CommerceEngine] getCart called. Key: ' + CART_KEY + ' Raw: ' + raw);

        try { return JSON.parse(safeStorage.getItem(CART_KEY)) || { items: [] }; }
        catch { return { items: [] }; }
    }
    
    function saveCart(cart) {
        console.log('[CommerceEngine] saveCart called. Key: ' + CART_KEY + ' Data: ' + JSON.stringify(cart));

        safeStorage.setItem(CART_KEY, JSON.stringify(cart));
        renderCartUI();
        renderCheckoutUI();
        updateCartBadges();
        // Dispatch event for specialized pages like checkout
        document.dispatchEvent(new CustomEvent('ce-cart-updated', { detail: { cart } }));
    }

    // --- Customer Auth State ---
    function getCustomer() {
        try {
            const data = safeStorage.getItem(CUSTOMER_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function saveCustomer(data) {
        console.log('[CommerceEngine] Saving customer:', data);
        safeStorage.setItem(CUSTOMER_KEY, JSON.stringify(data));
        syncAuthUI();
        // Dispatch event for external listeners
        document.dispatchEvent(new CustomEvent('wfc:auth-changed', {
            detail: { isLoggedIn: true, customer: data }
        }));
    }

    function clearCustomer() {
        console.log('[CommerceEngine] Clearing customer session');
        safeStorage.removeItem(CUSTOMER_KEY);
        // Also clear legacy keys just in case
        safeStorage.removeItem(`wf_customer_data_${STORE_KEY}`);
        
        document.dispatchEvent(new CustomEvent('ce-customer-logout'));
        document.dispatchEvent(new CustomEvent('wfc:auth-changed', {
            detail: { isLoggedIn: false, customer: null }
        }));
        syncAuthUI();
    }

    function getCustomerToken() {
        const c = getCustomer();
        return c ? c.token : null;
    }

    function isLoggedIn() {
        return !!getCustomerToken();
    }

    function logout() {
        clearCustomer();
        showToast('Logged out successfully');
        setTimeout(() => window.location.reload(), 800);
    }

    function syncAuthUI() {
        const loggedIn = isLoggedIn();
        const customer = getCustomer();
        console.log('[CommerceEngine] syncAuthUI -> Logged In:', loggedIn);

        // 1. Handle Display Groups (guest-only, auth-only)
        document.querySelectorAll('[data-commerce="guest-only"]').forEach(el => {
            el.style.display = loggedIn ? 'none' : (el.tagName === 'DIV' ? 'block' : '');
        });
        document.querySelectorAll('[data-commerce="auth-only"]').forEach(el => {
            el.style.display = loggedIn ? (el.tagName === 'DIV' ? 'flex' : '') : 'none';
        });

        // 2. Specific Component Toggling
        const loginForms = document.querySelectorAll('[data-commerce="login-form"]');
        loginForms.forEach(f => f.style.display = loggedIn ? 'none' : 'block');

        const accountLinks = document.querySelectorAll('[data-commerce="account-link"]');
        accountLinks.forEach(el => {
            el.style.display = loggedIn ? '' : 'none';
            if (loggedIn) el.href = el.getAttribute('data-account-url') || 'account.html';
        });

        const loginBtns = document.querySelectorAll('[data-commerce="customer-login"]');
        loginBtns.forEach(el => {
            if (!el.closest('[data-commerce="guest-only"]')) {
                el.style.display = loggedIn ? 'none' : '';
            }
        });

        const logoutBtns = document.querySelectorAll('[data-commerce="customer-logout"]');
        logoutBtns.forEach(el => el.style.display = loggedIn ? '' : 'none');

        // 3. User Data Projection
        if (loggedIn && customer) {
            document.querySelectorAll('[data-field="customer-name"]').forEach(el => {
                el.textContent = customer.name || customer.email.split('@')[0];
            });
            document.querySelectorAll('[data-field="customer-initial"]').forEach(el => {
                el.textContent = (customer.name || customer.email).charAt(0).toUpperCase();
            });
        }
    }

    // --- Coupon State ---
    function getAppliedCoupon() {
        try { return JSON.parse(safeStorage.getItem(COUPON_KEY)); }
        catch { return null; }
    }
    function saveAppliedCoupon(data) {
        safeStorage.setItem(COUPON_KEY, JSON.stringify(data));
        document.dispatchEvent(new CustomEvent('ce-cart-updated', { detail: { cart: getCart(), coupon: data } }));
    }
    function clearAppliedCoupon() {
        safeStorage.removeItem(COUPON_KEY);
        document.dispatchEvent(new CustomEvent('ce-cart-updated', { detail: { cart: getCart(), coupon: null } }));
    }

    function renderAuthForms() {
        const containers = document.querySelectorAll('[data-commerce="auth-forms"]');
        if (containers.length === 0) return;

        containers.forEach(container => {
            if (container.__wfcRendered) return;
            container.__wfcRendered = true;

            const mode = new URLSearchParams(window.location.search).get('mode') || 'login';
            container.style.display = 'block';
            bindButtons(container);
            
            const tabs = container.querySelectorAll('.auth-tab, .wfc-auth-tab');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    const targetMode = tab.dataset.mode || tab.dataset.target;
                    if (targetMode) {
                        tabs.forEach(t => t.classList.toggle('active', t === tab));
                        // The individual page scripts handle the actual form toggling
                    }
                };
                if (tab.dataset.mode === mode) tab.click();
            });
        });
    }

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

        // Dispatch custom events
        document.dispatchEvent(new CustomEvent('ce-added-to-cart', {
            detail: { productId, variantId, title, price: effectivePrice, quantity }
        }));
        document.dispatchEvent(new CustomEvent('wfc:added-to-cart', {
            detail: { productId, variantId, title, price: effectivePrice, quantity, cart: getCart() }
        }));
    }

    function removeFromCart(index) {
        const cart = getCart();
        const removed = cart.items[index];
        cart.items.splice(index, 1);
        saveCart(cart);
        document.dispatchEvent(new CustomEvent('wfc:removed-from-cart', {
            detail: { product: removed, index, cart: getCart() }
        }));
    }

    function updateQuantity(index, newQty) {
        const cart = getCart();
        if (newQty <= 0) { cart.items.splice(index, 1); }
        else { cart.items[index].quantity = newQty; }
        saveCart(cart);
    }

    function clearCart() {
        saveCart({ items: [] });
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

        console.log(`[CommerceEngine] API Request: ${url}`, config);
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API request failed');
            return data;
        } catch (err) {
            console.error(`[CommerceEngine] API Error (${endpoint}):`, err);
            throw err;
        }
    }

    // --- Cart Sidebar UI ---
    let cartSidebar = null;

    function createCartSidebar() {
        cartSidebar = document.querySelector('[data-commerce="cart-sidebar"]');
        
        // Read skin from explicit cart-sidebar element, or default
        const sidebarEl = document.querySelector('[data-commerce="cart-sidebar"]');
        const skin = sidebarEl?.getAttribute('data-skin') || 'default';
        
        if (cartSidebar) return;

        cartSidebar = document.createElement('div');
        cartSidebar.id = 'wf-commerce-cart';
        cartSidebar.innerHTML = `
      <div class="wfc-overlay"></div>
      <div class="wfc-sidebar wfc-skin-${skin}">
        <div class="wfc-sidebar-header">
          <div>
            <h3>Shopping Cart</h3>
            <p class="wfc-cart-subtitle" id="wfc-cart-count-label">0 items</p>
          </div>
          <button class="wfc-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="wfc-sidebar-body" id="wfc-cart-items"></div>
        <div class="wfc-sidebar-footer">
          <div class="wfc-coupon-row" id="wfc-coupon-row">
            <input type="text" id="wfc-coupon-input" placeholder="Enter coupon code" class="wfc-coupon-input" />
            <button id="wfc-coupon-btn" class="wfc-coupon-btn">Apply</button>
          </div>
          <div id="wfc-coupon-applied" class="wfc-coupon-applied" style="display:none"></div>
          <div class="wfc-price-breakdown">
            <div class="wfc-subtotal">
              <span>Subtotal</span>
              <span id="wfc-cart-subtotal">${CURRENCY_SYMBOL}0.00</span>
            </div>
            <div id="wfc-discount-row" class="wfc-discount-row" style="display:none">
              <span>Discount</span>
              <span id="wfc-discount-amount" class="wfc-discount-amount">-${CURRENCY_SYMBOL}0.00</span>
            </div>
            <div class="wfc-divider"></div>
            <div class="wfc-total">
              <span>Total</span>
              <span id="wfc-cart-total">${CURRENCY_SYMBOL}0.00</span>
            </div>
          </div>
          <a href="cart.html" class="wfc-view-cart-btn">
            View Full Cart
          </a>
          <button class="wfc-checkout-btn">
            <span>Proceed to Checkout</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
          <p class="wfc-secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    `;
        document.body.appendChild(cartSidebar);

        // Bind events
        cartSidebar.querySelector('.wfc-overlay').addEventListener('click', hideCart);
        cartSidebar.querySelector('.wfc-close').addEventListener('click', hideCart);
        cartSidebar.querySelector('#wfc-coupon-btn').addEventListener('click', applyCoupon);
        cartSidebar.querySelector('.wfc-checkout-btn').addEventListener('click', checkout);

        const style = document.createElement('style');
        style.textContent = getCartStyles();
        document.head.appendChild(style);

        // Restore applied coupon
        const coupon = getAppliedCoupon();
        if (coupon) updateCouponUI(coupon);
    }

    
    function renderCartUI() {
        console.log('[CommerceEngine] renderCartUI start (Robust Version)');
        const cart = getCart();
        const itemCount = cart.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
        const subtotal = cart.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
        const coupon = getAppliedCoupon();
        const discount = (coupon && coupon.valid) ? (coupon.discountAmount || 0) : 0;
        const total = Math.max(0, subtotal - discount);

        console.log('[CommerceEngine] Cart state:', { itemCount, subtotal, items: cart.items.length });

        // Update ALL sidebar item containers (both IDs and data-attributes)
        const sidebarContainers = document.querySelectorAll('#wfc-cart-items, [data-commerce="cart-items"]');
        sidebarContainers.forEach(sidebarContainer => {
            if (cart.items.length === 0) {
                sidebarContainer.innerHTML = '<div class="wfc-empty-cart"><p>Your cart is empty</p></div>';
            } else {
                try {
                    sidebarContainer.innerHTML = cart.items.map((item, i) => {
                        const p = parseFloat(item.price) || 0;
                        const op = item.originalPrice ? (parseFloat(item.originalPrice) || 0) : null;
                        return `
                        <div class="wfc-cart-item">
                            <div class="wfc-item-img-wrap">
                                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="wfc-item-img">` : '<div class="wfc-item-img wfc-placeholder"></div>'}
                            </div>
                            <div class="wfc-item-info">
                                <div class="wfc-item-title">${item.title || "Product"}</div>
                                ${item.variantLabel ? `<div class="wfc-item-variant">${item.variantLabel}</div>` : ""}
                                <div class="wfc-item-price">
                                    ${op ? `<span class="wfc-original-price">${CURRENCY_SYMBOL}${op.toFixed(2)}</span>` : ""}
                                    <span class="wfc-current-price">${CURRENCY_SYMBOL}${p.toFixed(2)}</span>
                                </div>
                                <div class="wfc-item-qty">
                                    <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity - 1})">-</button>
                                    <span>${item.quantity}</span>
                                    <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity + 1})">+</button>
                                </div>
                            </div>
                            <button class="wfc-remove" onclick="window.__commerceEngine.removeItem(${i})">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>`;
                    }).join("");
                } catch (e) {
                    console.error("[CommerceEngine] Error rendering sidebar:", e);
                }
            }
        });

        // Update ALL summary labels/totals
        document.querySelectorAll('#wfc-cart-subtotal, [data-commerce="cart-subtotal"]').forEach(el => el.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`);
        document.querySelectorAll('#wfc-cart-total, [data-commerce="cart-total"]').forEach(el => el.textContent = `${CURRENCY_SYMBOL}${total.toFixed(2)}`);
        document.querySelectorAll('#wfc-cart-count-label, [data-commerce="cart-count"]').forEach(el => {
            if (el.id === 'wfc-cart-count-label') el.textContent = `${itemCount} item${itemCount !== 1 ? "s" : ""}`;
            else el.textContent = itemCount;
        });
    }


    function showCart() { if (cartSidebar) cartSidebar.classList.add('wfc-open'); }
    function hideCart() { if (cartSidebar) cartSidebar.classList.remove('wfc-open'); }
    function toggleCart() {
        if (cartSidebar && cartSidebar.classList.contains('wfc-open')) hideCart();
        else showCart();
    }

    function updateCartBadges() {
        const cart = getCart();
        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('[data-commerce="cart-count"]').forEach(el => {
            el.textContent = itemCount;
        });
        // Also update auto-injected count badges inside cart-toggle elements
        document.querySelectorAll('[data-commerce="cart-toggle"] .wfc-auto-count').forEach(el => {
            el.textContent = itemCount;
            el.style.display = itemCount > 0 ? '' : 'none';
        });
    }

    function renderCheckoutUI() {
        const listContainer = document.getElementById('full-cart-items');
        const subtotalEl = document.getElementById('checkout-subtotal');
        const totalEl = document.getElementById('checkout-total');

        if (!listContainer) return;

        const cart = getCart();
        if (cart.items.length === 0) {
            listContainer.innerHTML = '<div style="padding: 100px; text-align: center; background: var(--bg-soft); border-radius: 24px;"><span style="font-size: 48px; display: block; margin-bottom: 20px;">🛍️</span><h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Your bag is empty</h3><p style="color: var(--text-muted); margin-bottom: 24px;">looks like you haven\'t added anything yet.</p><a href="shop.html" class="btn btn-primary">Start Shopping</a></div>';
            if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}0.00`;
            if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}0.00`;
            return;
        }

        listContainer.innerHTML = cart.items.map((item, i) => `
            <div style="display: flex; gap: 24px; padding: 24px 0; border-bottom: 1px solid var(--border); align-items: center;">
                <img src="${item.imageUrl}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;">
                <div style="flex: 1;">
                    <h4 style="font-weight: 800; margin-bottom: 4px;">${item.title}</h4>
                    ${item.variantLabel ? `<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">${item.variantLabel}</p>` : ''}
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-soft); padding: 4px 12px; border-radius: 8px;">
                            <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity - 1})" style="border:none; background:none; cursor:pointer; font-weight:800;">-</button>
                            <span style="font-weight: 700; min-width: 20px; text-align:center;">${item.quantity}</span>
                            <button onclick="window.__commerceEngine.updateQty(${i}, ${item.quantity + 1})" style="border:none; background:none; cursor:pointer; font-weight:800;">+</button>
                        </div>
                        <button onclick="window.__commerceEngine.removeItem(${i})" style="color: var(--danger); font-size: 13px; font-weight: 700; border:none; background:none; cursor:pointer;">Remove</button>
                    </div>
                </div>
                <div style="font-weight: 800; font-size: 18px;">
                    ${CURRENCY_SYMBOL}${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `).join('');

        const subtotal = getCartTotal();
        const coupon = getAppliedCoupon();
        const discount = (coupon && coupon.valid) ? (coupon.discountAmount || 0) : 0;
        const total = Math.max(0, subtotal - discount);

        if (subtotalEl) subtotalEl.textContent = `${CURRENCY_SYMBOL}${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${CURRENCY_SYMBOL}${total.toFixed(2)}`;
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
            appliedEl.innerHTML = `<span class="wfc-coupon-tag" > ${coupon.code} <button onclick="window.__commerceEngine.removeCoupon()">&times;</button></span> `;
            appliedEl.style.display = 'flex';
        }
        if (couponRow) couponRow.style.display = 'none';
        if (discountRow) discountRow.style.display = 'flex';
        if (discountAmount) discountAmount.textContent = `- ${CURRENCY_SYMBOL}${coupon.discountAmount.toFixed(2)} `;
    }

    // --- Customer Auth Modal ---
    let authModal = null;

    function showAuthModal(mode = 'login') {
        // Redirection for client-demo instead of popup
        if (window.location.pathname.includes('/client-demo/')) {
            window.location.href = `auth.html?mode=${mode}`;
            return;
        }

        if (authModal) { authModal.remove(); }

        authModal = document.createElement('div');
        authModal.className = 'wfc-auth-modal';
        authModal.innerHTML = `
            <div class="wfc-auth-overlay"></div>
                <div class="wfc-auth-box">
                    <button class="wfc-close">&times;</button>
                    <div class="wfc-auth-tabs">
                        <button class="wfc-auth-tab ${mode === 'login' ? 'active' : ''}" data-target="login">Sign In</button>
                        <button class="wfc-auth-tab ${mode === 'register' ? 'active' : ''}" data-target="register">Register</button>
                    </div>
                    <form id="wfc-auth-form">
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

        authModal.querySelector('.wfc-auth-overlay').addEventListener('click', closeAuth);
        authModal.querySelector('.wfc-close').addEventListener('click', closeAuth);
        authModal.querySelectorAll('.wfc-auth-tab').forEach(tab => {
            tab.addEventListener('click', () => switchAuth(tab.dataset.target));
        });
        authModal.querySelector('#wfc-auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitAuth();
        });

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
        const urlParams = new URLSearchParams(window.location.search);
        let mode = authModal?.dataset.mode || urlParams.get('mode') || 'login';

        // Detect mode from active UI tabs if available (auth.html support)
        const activeTab = document.querySelector('.auth-tab.active') || document.querySelector('.wfc-auth-tab.active');
        if (activeTab) {
            mode = activeTab.dataset.mode || activeTab.dataset.target || mode;
        }

        const email = document.getElementById('wfc-auth-email')?.value;
        const password = document.getElementById('wfc-auth-password')?.value;
        const errorEl = document.getElementById('wfc-auth-error');
        const submitBtn = document.querySelector('.wfc-auth-submit');

        if (!email || !password) return;
        if (submitBtn) { submitBtn.textContent = 'Please wait...'; submitBtn.disabled = true; }

        try {
            const body = { email, password };
            if (mode === 'register') {
                body.firstName = document.getElementById('wfc-auth-firstname')?.value || '';
                body.lastName = document.getElementById('wfc-auth-lastname')?.value || '';
            }

            const data = await api(`/customer/${mode}`, { method: 'POST', body });
            saveCustomer({ token: data.token, email: data.customer.email, name: data.customer.firstName || email.split('@')[0] });
            closeAuth();
            updateAccountUI();
            showToast(`Welcome${data.customer.firstName ? ', ' + data.customer.firstName : ''}!`);

            // Redirect to account if on standalone auth page
            if (window.location.pathname.includes('auth.html')) {
                setTimeout(() => window.location.href = 'account.html', 1500);
            }
        } catch (error) {
            if (errorEl) { errorEl.textContent = error.message; errorEl.style.display = 'block'; }
            if (submitBtn) {
                submitBtn.textContent = (mode === 'login' ? 'Sign In' : 'Create Account');
                submitBtn.disabled = false;
            }
        }
    }

    function updateAccountUI() {
        const customer = getCustomer();
        const isLoggedIn = !!getCustomerToken();
        console.log('[CommerceEngine] updateAccountUI - isLoggedIn:', isLoggedIn);

        document.querySelectorAll('[data-commerce="customer-login"]').forEach(el => {
            el.style.display = isLoggedIn ? 'none' : '';
        });
        document.querySelectorAll('[data-commerce="account-link"]').forEach(el => {
            if (isLoggedIn) {
                el.style.display = '';
                el.href = el.getAttribute('data-account-url') || 'account.html';
                const label = el.getAttribute('data-label');
                if (label) el.textContent = label;
            } else {
                el.style.display = 'none';
            }
        });

        if (isLoggedIn) renderAccountData();
        syncAuthUI();
    }

    // --- Account Data Rendering ---
    async function renderAccountData() {
        const token = getCustomerToken();
        console.log('[CommerceEngine] renderAccountData - token present:', !!token);
        if (!token) return;

        // 1. Fill profile fields
        const profileElements = document.querySelectorAll('[data-field^="customer-"]');
        if (profileElements.length > 0) {
            try {
                const profile = await api('/customer/profile');
                const data = profile.customer;
                profileElements.forEach(el => {
                    const field = el.getAttribute('data-field');
                    if (field === 'customer-name') el.textContent = data.firstName || data.email.split('@')[0];
                    if (field === 'customer-email') el.textContent = data.email;
                    if (field === 'customer-phone') el.textContent = data.phone || '';
                    if (field === 'customer-initial') el.textContent = (data.firstName || data.email).charAt(0).toUpperCase();
                });
            } catch (e) { console.error('[CommerceEngine] Profile fetch failed:', e); }
        }

        // 2. Fill order list
        const orderContainers = document.querySelectorAll('[data-commerce="account-orders-list"]');
        orderContainers.forEach(async (container) => {
            const template = container.querySelector('[data-commerce="order-template"]');
            if (!template) return;

            try {
                const res = await api('/customer/orders');
                const orders = res.orders;

                // Clear except template
                Array.from(container.children).forEach(child => {
                    if (child !== template) child.remove();
                });

                if (orders.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'wfc-empty-state';
                    empty.textContent = 'No orders found yet.';
                    container.appendChild(empty);
                } else {
                    orders.forEach(order => {
                        const replacements = {
                            ...order,
                            id: order.id.substring(0, 8).toUpperCase(),
                            shortId: order.id.substring(0, 8).toUpperCase(),
                            date: new Date(order.createdAt).toLocaleDateString(),
                            total: `${CURRENCY_SYMBOL}${parseFloat(order.totalAmount || 0).toFixed(2)}`
                        };

                        let html = template.outerHTML;
                        // Use a local version of replacePlaceholders for orders
                        const renderedHtml = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
                            const val = replacements[key.trim()];
                            return val !== undefined && val !== null ? val : match;
                        });

                        const temp = document.createElement('div');
                        temp.innerHTML = renderedHtml;
                        const item = temp.firstElementChild;
                        item.style.display = ''; // Ensure it's visible
                        item.removeAttribute('data-commerce'); // Prevent re-selection as template

                        container.appendChild(item);
                    });
                }
            } catch (e) { console.error('[CommerceEngine] Orders fetch failed:', e); }
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

    function replacePlaceholders(html, product) {
        if (!html) return '';
        const data = {
            ...product,
            // Ensure common alternates are available for templates
            id: product.id || product.productId || product._id || '',
            slug: product.slug || '',
            title: product.title || '',
                        categorySlug: (() => {
                let s = product.categories?.[0]?.slug || product.productCategories?.[0]?.category?.slug || '';
                const es = ['essential-cotton-tee', 'premium-flannel-shirt', 'classic-polo-shirt', 'titan-cargo'];
                if (es.includes(product.slug)) s = s ? `${s} essentials` : 'essentials';
                return s;
            })(),
            priceFormatted: product.price ? `${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)}` : '',
            salePriceFormatted: product.salePrice ? `${CURRENCY_SYMBOL}${parseFloat(product.salePrice).toFixed(2)}` : '',
            imageUrl: getImageUrl(product.imageUrl),
            currency: CURRENCY_SYMBOL
        };

        return html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const k = key.trim();
            const val = data[k];
            return val !== undefined && val !== null ? val : match;
        });
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
            <div class="wfc-category-list">
                <button class="wfc-cat-btn active" data-cat-slug="">All Products</button>
            ${topLevel.map(c => `
              <button class="wfc-cat-btn" data-cat-slug="${c.slug}">${c.name} <span class="wfc-cat-count">(${c.productCount})</span></button>
              ${(c.children || []).map(child => {
                    const ch = data.categories.find(x => x.id === child.id);
                    return ch ? `<button class="wfc-cat-btn wfc-cat-child" data-cat-slug="${ch.slug}">${ch.name} <span class="wfc-cat-count">(${ch.productCount})</span></button>` : '';
                }).join('')}
            `).join('')
                    }
          </div>
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

    // --- Complete Product Filter Panel ---
    async function renderProductFilter() {
        const containers = document.querySelectorAll('[data-commerce="product-filter"]');
        if (containers.length === 0) return;

        let categories = [];
        try {
            const catData = await api('/public/categories');
            categories = catData.categories?.filter(c => !c.parentId) || [];
        } catch (e) {
            console.warn('[CommerceEngine] Could not load categories for filter');
        }

        containers.forEach(container => {
            if (container.__wfcRendered) return;
            container.__wfcRendered = true;

            const layout = container.getAttribute('data-layout') || 'horizontal';
            const showCategory = container.getAttribute('data-category') !== 'false';
            const showPrice = container.getAttribute('data-price') !== 'false';
            const showSort = container.getAttribute('data-sort') !== 'false';

            const isVertical = layout === 'vertical';
            const layoutClass = isVertical ? 'wfc-filter-vertical' : 'wfc-filter-horizontal';

            let html = `<div class="wfc-product-filter ${layoutClass}">`;

            // Category filter
            if (showCategory && categories.length > 0) {
                html += `<div class="wfc-filter-group wfc-filter-categories">
                    ${isVertical ? '<label class="wfc-filter-label">Categories</label>' : ''}
                    <div class="wfc-filter-cat-list">
                        <span class="wfc-filter-cat active" data-cat-slug="">All</span>
                        ${categories.map(c => `<span class="wfc-filter-cat" data-cat-slug="${c.slug}">${c.name}${c.productCount ? ` <span class="wfc-filter-count">(${c.productCount})</span>` : ''}</span>`).join('')}
                    </div>
                </div>`;
            }

            // Price range filter
            if (showPrice) {
                html += `<div class="wfc-filter-group wfc-filter-price">
                    <label class="wfc-filter-label">Price</label>
                    <div class="wfc-price-range">
                        <input type="number" class="wfc-price-input" id="wfc-filter-min" placeholder="Min" min="0" />
                        <span class="wfc-price-sep">—</span>
                        <input type="number" class="wfc-price-input" id="wfc-filter-max" placeholder="Max" min="0" />
                        <span class="wfc-price-go" id="wfc-price-apply">Go</span>
                    </div>
                </div>`;
            }

            // Sort dropdown
            if (showSort) {
                html += `<div class="wfc-filter-group wfc-filter-sort">
                    <label class="wfc-filter-label">Sort</label>
                    <select class="wfc-sort-select" id="wfc-filter-sort">
                        <option value="">Default</option>
                        <option value="price-low">Price: Low → High</option>
                        <option value="price-high">Price: High → Low</option>
                        <option value="newest">Newest First</option>
                        <option value="name">Name: A → Z</option>
                    </select>
                </div>`;
            }

            // Result count (always on)
            html += `<div class="wfc-filter-group wfc-filter-result">
                <span class="wfc-filter-result-count" id="wfc-result-count">Loading...</span>
            </div>`;

            html += `</div>`;
            container.innerHTML = html;

            // --- Bind interactions ---

            // Category click
            container.querySelectorAll('.wfc-filter-cat').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.wfc-filter-cat').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    applyFilters(container);
                });
            });

            // Price apply
            const priceApply = container.querySelector('#wfc-price-apply');
            if (priceApply) {
                priceApply.addEventListener('click', () => applyFilters(container));
                // Also apply on Enter key
                container.querySelectorAll('.wfc-price-input').forEach(inp => {
                    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(container); });
                });
            }

            // Sort change
            const sortSelect = container.querySelector('#wfc-filter-sort');
            if (sortSelect) {
                sortSelect.addEventListener('change', () => applyFilters(container));
            }

            // Listen for products-loaded event to update count
            document.addEventListener('wfc:products-loaded', (e) => {
                const countEl = container.querySelector('#wfc-result-count');
                if (countEl && e.detail?.count !== undefined) {
                    countEl.textContent = `${e.detail.count} Product${e.detail.count !== 1 ? 's' : ''}`;
                }
            });

            // Also listen for old event
            document.addEventListener('ce-products-loaded', (e) => {
                const countEl = container.querySelector('#wfc-result-count');
                if (countEl && e.detail?.count !== undefined) {
                    countEl.textContent = `${e.detail.count} Product${e.detail.count !== 1 ? 's' : ''}`;
                }
            });
        });
    }

    function applyFilters(filterContainer) {
        // Get active category
        const activeCat = filterContainer.querySelector('.wfc-filter-cat.active');
        const catSlug = activeCat?.getAttribute('data-cat-slug') || '';

        // Get price range
        const minInput = filterContainer.querySelector('#wfc-filter-min');
        const maxInput = filterContainer.querySelector('#wfc-filter-max');
        const minPrice = minInput?.value || '';
        const maxPrice = maxInput?.value || '';

        // Get sort
        const sortSelect = filterContainer.querySelector('#wfc-filter-sort');
        const sortValue = sortSelect?.value || '';

        // Apply to all product-list containers on the page
        const productLists = document.querySelectorAll('[data-commerce="product-list"]');
        productLists.forEach(list => {
            // Set filter attributes dynamically
            if (catSlug) {
                list.setAttribute('data-category', catSlug);
            } else {
                list.removeAttribute('data-category');
            }
            if (minPrice) {
                list.setAttribute('data-min-price', minPrice);
            } else {
                list.removeAttribute('data-min-price');
            }
            if (maxPrice) {
                list.setAttribute('data-max-price', maxPrice);
            } else {
                list.removeAttribute('data-max-price');
            }
            if (sortValue) {
                list.setAttribute('data-sort', sortValue);
            } else {
                list.removeAttribute('data-sort');
            }
        });

        // Re-render product list
        renderProductList(catSlug || null);
    }

    // --- Product Rendering ---
    async function renderProductList(categorySlug = null) {
        const containers = document.querySelectorAll('[data-commerce="product-list"]');
        if (containers.length === 0) return;

        // Process each container independently so each can have its own filters
        for (const container of containers) {
            try {
                // Show skeleton loader
                const template = container.querySelector('[data-commerce="product-template"]');
                if (template) {
                    const skeletonCount = parseInt(container.getAttribute('data-limit')) || 4;
                    let skeletonHtml = '';
                    for (let i = 0; i < skeletonCount; i++) {
                        skeletonHtml += '<div class="wfc-skeleton-card"><div class="wfc-skeleton-img"></div><div class="wfc-skeleton-text"></div><div class="wfc-skeleton-text wfc-skeleton-short"></div></div>';
                    }
                    // Only add skeleton if no items rendered yet
                    if (!container.querySelector('[data-commerce="product-item"]')) {
                        const skelWrap = document.createElement('div');
                        skelWrap.className = 'wfc-skeleton-wrap';
                        skelWrap.innerHTML = skeletonHtml;
                        container.appendChild(skelWrap);
                    }
                }

                let endpoint = '/public/products';
                const type = container.getAttribute('data-type');
                const limit = container.getAttribute('data-limit');
                const category = container.getAttribute('data-category') || categorySlug;
                const specificIds = container.getAttribute('data-ids');
                const specificSlugs = container.getAttribute('data-slugs');

                let queryParams = [];

                // Specific products by ID or slug (overrides other filters)
                if (specificIds) {
                    queryParams.push(`ids=${specificIds.split(',').map(s => s.trim()).join(',')}`);
                } else if (specificSlugs) {
                    queryParams.push(`ids=${specificSlugs.split(',').map(s => s.trim()).join(',')}`);
                } else {
                    if (category) queryParams.push(`category=${category}`);
                    if (type === 'featured') queryParams.push('featured=true');
                    if (type === 'sale') queryParams.push('onSale=true');
                    if (type === 'related') queryParams.push('limit=4');
                }
                if (limit) queryParams.push(`limit=${limit}`);

                if (queryParams.length > 0) {
                    endpoint += `?${queryParams.join('&')}`;
                }

                const data = await api(endpoint);

                // Fallback: If featured is requested but few products returned, get all products instead
                if (type === 'featured' && data.products.length < 3) {
                    const fallbackData = await api(`/public/products?limit=${limit || 6}`);
                    data.products = fallbackData.products;
                }

                // Phase 2: Client-side price filtering
                const minPrice = parseFloat(container.getAttribute('data-min-price'));
                const maxPrice = parseFloat(container.getAttribute('data-max-price'));
                if (!isNaN(minPrice)) {
                    data.products = data.products.filter(p => parseFloat(p.salePrice || p.price) >= minPrice);
                }
                if (!isNaN(maxPrice)) {
                    data.products = data.products.filter(p => parseFloat(p.salePrice || p.price) <= maxPrice);
                }

                // Phase 2: Client-side attribute filtering
                const filterColor = container.getAttribute('data-color');
                const filterSize = container.getAttribute('data-size');
                const filterStock = container.getAttribute('data-in-stock');
                const filterSale = container.getAttribute('data-on-sale');

                if (filterColor || filterSize || filterStock || filterSale) {
                    console.log(`[CommerceEngine] Applying Filters - Color: ${filterColor}, Size: ${filterSize}, Stock: ${filterStock}, Sale: ${filterSale}`);
                    console.log(`[CommerceEngine] Before Filter: ${data.products.length} products`);
                }

                if (filterColor) {
                    const target = filterColor.toLowerCase().trim();
                    data.products = data.products.filter(p => {
                        if (!p.variants) return false;
                        return p.variants.some(v => {
                            if (!v.attributes) return false;
                            return Object.entries(v.attributes).some(([key, val]) => 
                                (['color', 'colour'].includes(key.toLowerCase())) && 
                                (String(val).toLowerCase().trim() === target)
                            );
                        });
                    });
                }
                if (filterSize) {
                    const target = filterSize.toLowerCase().trim();
                    data.products = data.products.filter(p => {
                        if (!p.variants) return false;
                        return p.variants.some(v => {
                            if (!v.attributes) return false;
                            return Object.entries(v.attributes).some(([key, val]) => 
                                key.toLowerCase() === 'size' && 
                                (String(val).toLowerCase().trim() === target)
                            );
                        });
                    });
                }
                if (filterStock === 'true') {
                    data.products = data.products.filter(p => p.inStock);
                }
                if (filterSale === 'true') {
                    data.products = data.products.filter(p => p.onSale);
                }

                if (filterColor || filterSize || filterStock || filterSale) {
                    console.log(`[CommerceEngine] After Filter: ${data.products.length} products`);
                }

                // Phase 2: Client-side sorting
                const sortBy = container.getAttribute('data-sort');
                if (sortBy) {
                    switch (sortBy) {
                        case 'price-low':
                            data.products.sort((a, b) => parseFloat(a.salePrice || a.price) - parseFloat(b.salePrice || b.price));
                            break;
                        case 'price-high':
                            data.products.sort((a, b) => parseFloat(b.salePrice || b.price) - parseFloat(a.salePrice || a.price));
                            break;
                        case 'newest':
                            data.products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            break;
                        case 'name':
                            data.products.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                            break;
                    }
                }

                // Update result count (scoped to nearest parent or global)
                const resultCountEl = container.closest('section')?.querySelector('[data-commerce="result-count"]');
                if (resultCountEl) resultCountEl.textContent = data.products.length;
                // Also update global ones
                document.querySelectorAll('[data-commerce="result-count"]:not([data-scoped])').forEach(el => {
                    el.textContent = data.products.length;
                });

                if (!template) continue;

                // Clear previous items except template
                Array.from(container.children).forEach(child => {
                    if (child !== template) child.remove();
                });

                data.products.forEach(product => {
                    // Start of Variant Sync: If filters are active, show matching variant image/price
                    let displayProduct = { ...product };
                    if (filterColor || filterSize) {
                        const targetColor = filterColor ? filterColor.toLowerCase().trim() : null;
                        const targetSize = filterSize ? filterSize.toLowerCase().trim() : null;

                        const matchingVariant = product.variants?.find(v => {
                            if (!v.attributes) return false;
                            let matchesColor = !targetColor;
                            let matchesSize = !targetSize;

                            Object.entries(v.attributes).forEach(([k, val]) => {
                                const key = k.toLowerCase();
                                const value = String(val).toLowerCase().trim();
                                if (['color', 'colour'].includes(key) && targetColor === value) matchesColor = true;
                                if (key === 'size' && targetSize === value) matchesSize = true;
                            });

                            return matchesColor && matchesSize;
                        });

                        if (matchingVariant) {
                            if (matchingVariant.imageUrl) displayProduct.imageUrl = matchingVariant.imageUrl;
                            if (matchingVariant.price) {
                                displayProduct.price = matchingVariant.price;
                                displayProduct.salePrice = matchingVariant.salePrice;
                                displayProduct.onSale = !!matchingVariant.salePrice;
                            }
                        }
                    }
                    // End of Variant Sync

                    let html;
                    if (template.tagName === 'TEMPLATE') {
                        html = template.innerHTML;
                    } else {
                        html = template.outerHTML;
                    }

                    const productHtml = replacePlaceholders(html, displayProduct);
                    const temp = document.createElement('div');
                    temp.innerHTML = productHtml;
                    const item = temp.firstElementChild;

                    if (template.tagName !== 'TEMPLATE') {
                        item.style.display = '';
                    }

                    item.setAttribute('data-commerce', 'product-item');
                    item.setAttribute('data-product-id', product.id || product.productId);
                                        let catSlug = product.categories?.[0]?.slug || product.productCategories?.[0]?.category?.slug || '';
                    const essentialsSlugs = ['essential-cotton-tee', 'premium-flannel-shirt', 'classic-polo-shirt', 'titan-cargo'];
                    if (essentialsSlugs.includes(product.slug)) {
                        catSlug = catSlug ? `${catSlug} essentials` : 'essentials';
                    }
                    if (catSlug) item.setAttribute('data-category', catSlug);

                    // Bug Fix: Populate WishlistMap for guests and cross-page identity
                    if (product.id && product.slug) {
                        const map = getWishlistMap();
                        map[product.id] = product.slug;
                        map[product.slug] = product.id;
                        saveWishlistMap(map);
                    }

                    fillProductFields(item, displayProduct);
                    bindButtons(item);
                    container.appendChild(item);
                });
                
                // Refresh wishlist icons for newly rendered products
                updateWishlistIcons();

                // Dispatch events
                container.dispatchEvent(new CustomEvent('ce-products-loaded', {
                    bubbles: true,
                    detail: { products: data.products, container }
                }));
                document.dispatchEvent(new CustomEvent('wfc:products-loaded', {
                    detail: { products: data.products, container, count: data.products.length }
                }));

            } catch (error) {
                console.error('[CommerceEngine] Failed to load products for container:', container, error);
                // Remove skeleton on error
                const skel = container.querySelector('.wfc-skeleton-wrap');
                if (skel) skel.remove();
            }
        }
    }


    async function renderProductDetail(container, slugOverride = null) {
        if (!container) return;
        console.log("[CommerceEngine] Starting renderProductDetail");
        try {
            container.classList.add('ce-is-updating');

            // Get slug with hash support for static servers
            const params = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') > -1 ? window.location.hash.indexOf('?') : (window.location.hash.startsWith('#slug=') ? 1 : 0)).replace('#', ''));
            const attrSlug = container.getAttribute('data-product-slug');
            const slug = slugOverride || attrSlug || params.get('slug') || hashParams.get('slug') || window.location.hash.replace('#', '').split('?')[0] || window.location.pathname.split('/').pop().replace('.html', '');

            console.log("[CommerceEngine] Detected Slug: " + slug);

            if (!slug || slug === 'product' || slug === 'product.html') {
                // Fallback to first product
                const data = await api('/public/products?limit=1');
                if (data.products && data.products.length > 0) {
                    renderProductDetail(container, data.products[0].slug);
                    return;
                }
                throw new Error('Product not found');
            }

            console.log(`[CommerceEngine] Fetching from API: ${API_BASE}/api/v1/public/products/${slug}`);
            const data = await api(`/public/products/${slug}`);
            console.log("[CommerceEngine] API returned data: " + (data ? "SUCCESS" : "NULL"));

            if (!data || !data.product) {
                console.error('[CommerceEngine] Product data invalid or missing product object');
                throw new Error('Product data invalid');
            }

            const product = data.product;
            container.setAttribute('data-product-id', product.id);

            // Bug Fix #6: Auto-track viewed product
            trackViewedProduct(product.id);

            console.log(`[CommerceEngine] Filling fields for: ${product.title}`);
            fillProductFields(container, product);

            // Render variants into ALL variant-selector containers (supports split Color/Size)
            const variantContainers = container.querySelectorAll('[data-commerce="variants"], [data-commerce="variant-selector"], [data-commerce="variant-options"]');
            if (variantContainers.length > 0 && product.variants && product.variants.length > 0) {
                variantContainers.forEach(vc => renderVariants(vc, product));
            }

            bindButtons(container);

            // Render reviews section
            const reviewsContainer = container.querySelector('[data-commerce="reviews"]');
            if (reviewsContainer && product.reviews) {
                renderReviews(reviewsContainer, product.reviews);
            }

            // Render review form
            const formContainer = container.querySelector('[data-commerce="review-form"]');
            if (formContainer) {
                renderReviewForm(formContainer, product.id);
            }

            container.classList.remove('ce-is-updating');
            document.dispatchEvent(new CustomEvent('ce-product-loaded', { detail: { product, container } }));

        } catch (error) {
            console.error('[CommerceEngine] Failed to load product:', error);
            // Clear loading state
            const desc = container.querySelector('[data-field="description"]');
            if (desc) desc.textContent = 'Failed to load product details.';
            container.classList.remove('ce-is-updating');
        }
    }

    function fillProductFields(element, product) {
        console.log('[CommerceEngine] fillProductFields start', { product });
        const fields = element.querySelectorAll('[data-field]');
        console.log(`[CommerceEngine] Found ${fields.length} fields to fill`);
        fields.forEach(field => {
            const fieldName = field.getAttribute('data-field');
            // Helper to clear placeholder text (like {{title}}) if no value
            const clearPlaceholder = (val) => val === undefined || val === null ? '' : val;

            switch (fieldName) {
                case 'title':
                    field.textContent = clearPlaceholder(product.title);
                    break;
                case 'price':
                    if (product.onSale) {
                        field.innerHTML = `<span class="wfc-original-price">${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)}</span> <span class="wfc-sale-price">${CURRENCY_SYMBOL}${parseFloat(product.salePrice).toFixed(2)}</span>`;
                    } else {
                        field.textContent = `${CURRENCY_SYMBOL}${parseFloat(product.price).toFixed(2)}`;
                    }
                    break;
                case 'category':
                    if (product.categories && product.categories.length > 0) {
                        field.innerHTML = product.categories.map(c => `<span class="wfc-category-tag">${c.name}</span>`).join('');
                    } else {
                        field.innerHTML = ''; // Clear {{category}}
                    }
                    break;
                case 'description':
                    field.innerHTML = product.description || '';
                    break;
                case 'short-description':
                    field.innerHTML = product.shortDescription || product.description?.substring(0, 150) || '';
                    break;
                case 'long-description':
                    field.innerHTML = product.longDescription || product.description || '';
                    break;
                case 'image':
                    const finalUrl = getImageUrl(product.imageUrl || product.imageUrl);
                    if (field.tagName === 'IMG') {
                        field.src = finalUrl;
                        field.alt = product.title || '';
                    } else {
                        field.style.backgroundImage = `url(${finalUrl})`;
                    }
                    break;
                case 'gallery':
                    if (product.galleryImages && product.galleryImages.length > 0) {
                        field.innerHTML = product.galleryImages.map(url => `<img src="${url}" alt="${product.title}" class="wfc-gallery-img">`).join('');
                    } else {
                        field.innerHTML = '';
                    }
                    break;
                case 'badge':
                    const badgeType = field.getAttribute('data-badge-type') || 'auto';
                    if (badgeType === 'category') {
                        // Show category as badge
                        if (product.categories && product.categories.length > 0) {
                            field.innerHTML = `<span class="wfc-badge wfc-badge-category">${product.categories[0].name}</span>`;
                        } else {
                            field.innerHTML = '';
                        }
                    } else if (badgeType === 'custom') {
                        // Show custom text
                        const customText = field.getAttribute('data-badge-text') || '';
                        field.innerHTML = customText ? `<span class="wfc-badge wfc-badge-custom">${customText}</span>` : '';
                    } else {
                        // Auto badge (default)
                        if (!product.inStock) {
                            field.innerHTML = '<span class="wfc-badge wfc-badge-soldout">Sold Out</span>';
                        } else if (product.onSale) {
                            const pct = Math.round((1 - product.salePrice / product.price) * 100);
                            field.innerHTML = `<span class="wfc-badge wfc-badge-sale">-${pct}%</span>`;
                        } else if (product.isFeatured) {
                            field.innerHTML = '<span class="wfc-badge wfc-badge-featured">Featured</span>';
                        } else {
                            field.innerHTML = '';
                        }
                    }
                    break;
                case 'rating':
                    if (product.rating !== undefined && product.rating !== null) {
                        const score = parseFloat(product.rating);
                        const full = Math.floor(score);
                        const half = score % 1 >= 0.5 ? 1 : 0;
                        const empty = 5 - full - half;
                        field.innerHTML = `<div class="wfc-rating-inline">
                            <span class="wfc-stars">
                                ${'<span class="wfc-star-full">&#9733;</span>'.repeat(full)}
                                ${half ? '<span class="wfc-star-half">&#9733;</span>' : ''}
                                ${'<span class="wfc-star-empty">&#9734;</span>'.repeat(Math.max(0, empty))}
                            </span>
                            <span class="wfc-review-count">(${product.reviewCount || 0})</span>
                        </div>`;
                    } else {
                        field.innerHTML = `<span class="wfc-no-rating">No reviews yet</span>`;
                    }
                    break;
                // Bug Fix #1: Removed duplicate 'badge' case (was copy of L1179-1190)
                case 'stock-status':
                    field.textContent = product.inStock ? (product.stockStatus === 'onbackorder' ? 'On Backorder' : 'In Stock') : 'Out of Stock';
                    field.className = product.inStock ? 'wfc-in-stock' : 'wfc-out-of-stock';
                    break;
                case 'link':
                    if (field.tagName === 'A') {
                        field.href = `product.html?slug=${product.slug}`;
                    }
                    break;
                case 'sku':
                    field.textContent = product.sku || '';
                    break;
            }
        });
    }

    function renderVariants(container, product) {
        // Support split selectors by filtering attributes if data-attribute is present
        const filterAttr = container.getAttribute('data-attribute');

        // Extract unique attribute groups
        const attrGroups = {};
        product.variants.forEach(v => {
            if (v.attributes && typeof v.attributes === 'object') {
                Object.entries(v.attributes).forEach(([key, value]) => {
                    // If filter is set, only include that specific attribute
                    if (filterAttr && key.toLowerCase() !== filterAttr.toLowerCase()) return;

                    if (!attrGroups[key]) attrGroups[key] = new Set();
                    attrGroups[key].add(value);
                });
            }
        });

        if (Object.keys(attrGroups).length === 0) {
            container.style.display = 'none';
            // Only hide the immediate .variant-group, NOT the whole section
            const group = container.closest('.variant-group');
            if (group) group.style.display = 'none';
            return;
        } else {
            const group = container.closest('.variant-group');
            if (group) group.style.display = 'block';
        }

        // Track selected attributes globally for this product scope
        const detail = container.closest('[data-commerce="product-detail"]') || container.closest('[data-product-scope]');
        if (!detail._selectedAttrs) detail._selectedAttrs = {};
        const selectedAttrs = detail._selectedAttrs;

        // Auto-select first options if none selected
        product.variants[0]?.attributes && Object.keys(product.variants[0].attributes).forEach(key => {
            if (!selectedAttrs[key]) {
                selectedAttrs[key] = product.variants[0].attributes[key];
            }
        });

        // Build UI
        let html = '';
        Object.entries(attrGroups).forEach(([key, values]) => {
            const isColor = key.toLowerCase().includes('color') || key.toLowerCase().includes('colour');

            html += `<div class="wfc-attribute-group">`;

            // Only add a label if we are NOT on a filtered split selector
            if (!filterAttr) {
                html += `<label class="wfc-variant-label">${key}</label>`;
            }

            html += `<div class="wfc-variant-options ${isColor ? 'aura-variant-grid' : 'aura-size-grid'}">
                ${[...values].map(v => {
                if (isColor) {
                    return `<button class="wfc-variant-btn wfc-color-btn" data-attr-key="${key}" data-attr-value="${v}" style="background:${v.toLowerCase()}" title="${v}"></button>`;
                }
                return `<button class="wfc-variant-btn size-pill" data-attr-key="${key}" data-attr-value="${v}">${v}</button>`;
            }).join('')}
            </div>`;

            html += `</div>`;
        });

        container.innerHTML = html;

        // Event Delegation for variant buttons
        container.querySelectorAll('.wfc-variant-btn').forEach(btn => {
            const key = btn.getAttribute('data-attr-key');
            const value = btn.getAttribute('data-attr-value');

            if (selectedAttrs[key] === value) btn.classList.add('active');

            btn.onclick = () => {
                selectedAttrs[key] = value;

                // Update ALL selectors in this scope to show active state
                detail.querySelectorAll('[data-commerce="variant-selector"]').forEach(sel => {
                    sel.querySelectorAll(`.wfc-variant-btn[data-attr-key="${key}"]`).forEach(b => {
                        b.classList.toggle('active', b.getAttribute('data-attr-value') === value);
                    });
                });

                updateVariantDisplay();
            };
        });

        // Initial setup for add-to-cart button
        const addBtn = detail?.querySelector('[data-commerce="add-to-cart"]');
        if (addBtn && !addBtn.__variantBound) {
            addBtn.__variantBound = true;
            addBtn.addEventListener('click', (e) => {
                const currentVariant = findCurrentVariant();
                if (currentVariant) {
                    e.preventDefault();
                    e.stopPropagation();
                    const label = Object.entries(selectedAttrs).map(([k, v]) => `${k}: ${v}`).join(', ');
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

                    addToCart(product.id, currentVariant.id, product.title, currentVariant.price, imgUrl, quantity, currentVariant.salePrice);
                    showToast(`Added ${product.title} (${label}) to cart`);
                } else {
                    e.preventDefault();
                    showToast('Please select all options');
                }
            }, true);
        }

        updateVariantDisplay();

        function findCurrentVariant() {
            return product.variants.find(v => {
                if (!v.attributes || !v.isActive) return false;
                // Match ALL attributes of the variant against our selection
                return Object.entries(v.attributes).every(([k, val]) => selectedAttrs[k] === val);
            });
        }

        function updateVariantDisplay() {
            const currentVariant = findCurrentVariant();

            if (currentVariant) {
                // Update hidden input
                const variantInput = detail?.querySelector('[data-commerce="variant-select"]');
                if (variantInput) variantInput.value = currentVariant.id;

                // Update price
                detail?.querySelectorAll('[data-field="price"]').forEach(el => {
                    el.textContent = `${CURRENCY_SYMBOL}${parseFloat(currentVariant.price).toFixed(2)}`;
                });

                // Update image with Advanced Spring & Slide Animation
                const imgEl = detail?.querySelector('[data-field="image"]');
                if (imgEl) {
                    const newSrc = getImageUrl(currentVariant.imageUrl || product.imageUrl);
                    if (imgEl.src !== newSrc) {
                        // Determine slide direction (placeholder logic for now, could be enhanced)
                        const isSizeChange = container.getAttribute('data-attribute')?.toLowerCase() === 'size';
                        const slideX = isSizeChange ? 0 : 100; // Slide in from right for color changes

                        imgEl.style.transition = 'none';
                        imgEl.style.opacity = '0';
                        imgEl.style.transform = `translateX(${slideX}px) scale(0.8) rotate(5deg)`;

                        // Force reflow
                        imgEl.offsetHeight;

                        imgEl.src = newSrc;
                        imgEl.onload = () => {
                            imgEl.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                            imgEl.style.opacity = '1';
                            imgEl.style.transform = 'translateX(0) scale(1) rotate(0deg)';
                        };
                    }
                }

                // Atmospheric Lighting
                if (currentVariant.attributes && currentVariant.attributes.Color) {
                    const color = currentVariant.attributes.Color.toLowerCase();
                    const bgLayer = detail?.querySelector('.aura-bg-layer');
                    const glowEl = detail?.querySelector('.aura-image-glow');

                    if (bgLayer || glowEl) {
                        let grad = '';
                        let colorHex = '';
                        if (color.includes('orange')) { grad = 'var(--aura-orange-grad)'; colorHex = 'var(--aura-orange)'; }
                        else if (color.includes('olive') || color.includes('green')) { grad = 'var(--aura-olive-grad)'; colorHex = 'var(--aura-olive)'; }
                        else if (color.includes('purple') || color.includes('blue')) { grad = 'var(--aura-purple-grad)'; colorHex = 'var(--aura-purple)'; }

                        if (grad && bgLayer) {
                            bgLayer.style.transition = 'all 1s ease-in-out';
                            bgLayer.style.background = grad;
                        }
                        if (colorHex && glowEl) {
                            glowEl.style.transition = 'background-color 0.7s ease';
                            glowEl.style.backgroundColor = colorHex;
                        }
                    }
                }

                // Update add-to-cart button (don't overwrite SVG content)
                const addBtn = detail?.querySelector('[data-commerce="add-to-cart"]');
                if (addBtn) {
                    addBtn.disabled = false;
                    addBtn.style.opacity = '1';
                    if (!addBtn.hasAttribute('data-original-text')) {
                        addBtn.setAttribute('data-original-text', addBtn.textContent);
                    }
                    const baseText = addBtn.getAttribute('data-original-text').split('—')[0].trim();
                    // Check if the button contains SVG content before updating textContent
                    if (!addBtn.querySelector('svg')) {
                        addBtn.textContent = `${baseText} — ${CURRENCY_SYMBOL}${parseFloat(currentVariant.price).toFixed(2)}`;
                    }
                }

                // Dispatch ce-variant-changed event for external animation hooks
                document.dispatchEvent(new CustomEvent('ce-variant-changed', {
                    detail: {
                        variant: currentVariant,
                        product: product,
                        imageElement: imgEl,
                        container: detail
                    }
                }));

            } else {
                // Disable button if partial selection
                const addBtn = detail?.querySelector('[data-commerce="add-to-cart"]');
                if (addBtn) {
                    addBtn.disabled = true;
                    addBtn.style.opacity = '0.5';
                    addBtn.textContent = 'Select Options';
                }
            }
        }
    }

    function renderReviews(container, reviews) {
        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div class="wfc-reviews-empty">
                    <p>Be the first to review this product!</p>
                </div>`;
            return;
        }
        container.innerHTML = `
            <div class="wfc-reviews-list">
                ${reviews.map(r => `
                    <div class="wfc-review-card">
                        <div class="wfc-review-header">
                            <div class="wfc-stars">
                                ${'<span class="wfc-star-full">&#9733;</span>'.repeat(r.rating)}
                                ${'<span class="wfc-star-empty">&#9734;</span>'.repeat(5 - r.rating)}
                            </div>
                            <div class="wfc-review-meta">
                                <strong>${r.author || 'Anonymous'}</strong>
                                <span>• ${new Date(r.date || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                        ${r.title ? `<h4 class="wfc-review-title">${r.title}</h4>` : ''}
                        <p class="wfc-review-text">${r.content || ''}</p>
                    </div>
                `).join('')}
            </div>`;
    }

    function renderReviewForm(container, productId) {
        if (!isLoggedIn()) {
            container.innerHTML = `
                <div class="wfc-review-auth-prompt">
                    <p>Please log in to share your thoughts about this product.</p>
                    <button class="wfc-btn-secondary" onclick="window.AuraEngine.showAuthModal('login')">Sign In to Review</button>
                </div>`;
            return;
        }

        container.innerHTML = `
            <form class="wfc-review-form" id="ce-review-form-${productId}">
                <h3>Write a Review</h3>
                <div class="wfc-star-input-wrap">
                    <label>Your Rating</label>
                    <div class="wfc-star-input">
                        ${[1, 2, 3, 4, 5].map(i => `<span class="wfc-star-item" data-value="${i}">&#9734;</span>`).join('')}
                    </div>
                    <input type="hidden" name="rating" value="0" required />
                </div>
                <div class="wfc-form-group">
                    <input type="text" name="title" placeholder="Review Title (optional)" class="wfc-input" />
                </div>
                <div class="wfc-form-group">
                    <textarea name="content" placeholder="Share your experience..." class="wfc-textarea" required></textarea>
                </div>
                <div id="wfc-review-error" class="wfc-error-msg" style="display:none"></div>
                <button type="submit" class="wfc-btn-submit">Submit Review</button>
            </form>`;

        const form = container.querySelector('form');
        const stars = form.querySelectorAll('.wfc-star-item');
        const ratingInput = form.querySelector('input[name="rating"]');

        stars.forEach(star => {
            star.onmouseover = () => {
                const val = parseInt(star.dataset.value);
                stars.forEach((s, idx) => {
                    s.innerHTML = idx < val ? '&#9733;' : '&#9734;';
                    s.classList.toggle('hover', idx < val);
                });
            };
            star.onmouseleave = () => {
                const currentVal = parseInt(ratingInput.value);
                stars.forEach((s, idx) => {
                    s.innerHTML = idx < currentVal ? '&#9733;' : '&#9734;';
                    s.classList.remove('hover');
                });
            };
            star.onclick = () => {
                ratingInput.value = star.dataset.value;
                const val = parseInt(star.dataset.value);
                stars.forEach((s, idx) => {
                    s.innerHTML = idx < val ? '&#9733;' : '&#9734;';
                    s.classList.toggle('selected', idx < val);
                });
            };
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('.wfc-btn-submit');
            const errorEl = form.querySelector('#wfc-review-error');
            
            if (ratingInput.value === '0') {
                errorEl.textContent = 'Please select a star rating';
                errorEl.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                await AuraEngine.submitReview({
                    productId,
                    rating: parseInt(ratingInput.value),
                    title: form.title.value,
                    content: form.content.value
                });
                
                container.innerHTML = `
                    <div class="wfc-review-success">
                        <div class="wfc-success-icon">✓</div>
                        <h3>Thank you!</h3>
                        <p>Your review has been submitted successfully.</p>
                        <button class="wfc-btn-secondary" onclick="window.AuraEngine.refresh()">Refresh Reviews</button>
                    </div>`;
                
                // Also trigger a global refresh to update avg ratings elsewhere
                setTimeout(() => AuraEngine.refresh(), 2000);
            } catch (err) {
                errorEl.textContent = err.message || 'Failed to submit review';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Submit Review';
            }
        };
    }

    // --- Checkout ---
    let stripeInstance = null;
    let cardElement = null;

    async function mountStripeElements(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Auto-load Stripe.js if missing
        if (!window.Stripe) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        const storeRes = await api('/public/store-info'); // Need public key
        if (!storeRes.stripePublicKey) {
            container.innerHTML = '<p style="color:red">Stripe not configured for this store.</p>';
            return;
        }

        stripeInstance = window.Stripe(storeRes.stripePublicKey);
        const elements = stripeInstance.elements();

        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#1e293b',
                    fontFamily: 'Inter, sans-serif',
                    '::placeholder': { color: '#94a3b8' },
                }
            }
        });

        cardElement.mount(`#${containerId}`);
    }

    async function checkout() {
        const cart = getCart();
        if (cart.items.length === 0) { showToast('Your cart is empty'); return; }

        // Detect if on-site checkout form exists
        const form = document.querySelector('[data-checkout-form]');
        if (form) {
            return processOnSiteCheckout();
        }

        // Redirect to new on-site checkout page
        window.location.href = 'checkout.html';
    }

    async function renderPaymentGateways(container) {
        if (!container) return;
        
        try {
            container.innerHTML = '<div class="wfc-loading">Loading payment methods...</div>';
            const res = await api('/public/payments/active');
            const gateways = res.gateways || [];
            
            if (gateways.length === 0) {
                container.innerHTML = '<p style="color:red">No payment methods available.</p>';
                return;
            }

            container.innerHTML = gateways.map((g, idx) => {
                const isActive = idx === 0; // Default first one
                let icon = '💳';
                if (g.provider === 'jazzcash') icon = '📱';
                if (g.provider === 'easypaisa') icon = '🐘';
                if (g.provider === 'cod') icon = '📦';

                const isWallet = g.provider === 'jazzcash' || g.provider === 'easypaisa';

                return `
                <label class="payment-option ${isActive ? 'active' : ''}" id="${g.provider}-label">
                    <input type="radio" name="payment_method" value="${g.provider}" ${isActive ? 'checked' : ''} 
                        onchange="window.AuraEngine.updatePaymentUI('${g.provider}')">
                    <div class="payment-header">
                        <div class="payment-info">
                            <div class="radio-dot"></div>
                            <span>${icon} ${g.name}</span>
                        </div>
                        <div class="flex gap-1 opacity-40">
                            ${g.provider === 'stripe' ? '<span class="text-[10px]">VISA/MC</span>' : ''}
                            ${g.provider === 'cod' ? '<span class="text-[10px] text-[#2fb15c]">PAY LATER</span>' : ''}
                        </div>
                    </div>
                    ${g.provider === 'stripe' ? '<div id="stripe-card-element" style="margin-top:15px; padding:15px; background:#fafafa; border:1px solid #eee; border-radius:12px;"></div>' : ''}
                    ${isWallet ? `
                        <div class="wallet-input" style="margin-top:15px; display:${isActive ? 'block' : 'none'}">
                            <label style="font-size:10px; text-transform:uppercase; font-weight:bold; letter-spacing:1px; opacity:0.5; margin-bottom:5px; display:block;">Account Number / Mobile</label>
                            <input type="text" name="wallet_number" placeholder="03xx xxxxxxx" 
                                style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; background:white; font-size:14px; focus:outline-none; focus:border-black;">
                        </div>
                    ` : ''}
                    ${g.description ? `<p class="wfc-gateway-desc" style="margin-top:10px; font-size:12px; opacity:0.7; display:${isActive ? 'block' : 'none'}">${g.description}</p>` : ''}
                </label>`;
            }).join('');

            // If stripe is present, mount it
            if (gateways.find(g => g.provider === 'stripe')) {
                mountStripeElements('stripe-card-element');
            }

            // Bind helper to window for the onchange event
            window.AuraEngine.updatePaymentUI = (method) => {
                document.querySelectorAll('.payment-option').forEach(el => {
                    el.classList.remove('active');
                    const desc = el.querySelector('.wfc-gateway-desc');
                    if (desc) desc.style.display = 'none';
                    const wallet = el.querySelector('.wallet-input');
                    if (wallet) wallet.style.display = 'none';
                });
                const activeLabel = document.getElementById(method + '-label');
                if (activeLabel) {
                    activeLabel.classList.add('active');
                    const desc = activeLabel.querySelector('.wfc-gateway-desc');
                    if (desc) desc.style.display = 'block';
                    const wallet = activeLabel.querySelector('.wallet-input');
                    if (wallet) wallet.style.display = 'block';
                }
            };

        } catch (err) {
            console.error('[CommerceEngine] Failed to render gateways:', err);
            container.innerHTML = '<p style="color:red">Failed to load payment methods.</p>';
        }
    }

    async function processOnSiteCheckout() {
        const checkoutBtn = document.querySelector('[data-commerce="checkout-submit"]');
        if (checkoutBtn) {
            checkoutBtn.setAttribute('data-original-text', checkoutBtn.textContent);
            checkoutBtn.textContent = 'Finalizing Order...';
            checkoutBtn.disabled = true;
        }

        try {
            // Bug Fix #3: Read form inputs by standard 'name' attribute (matches documentation)
            const email = document.querySelector('[name="email"]')?.value || document.querySelector('[data-field="checkout-email"]')?.value;
            const name = document.querySelector('[name="fullName"]')?.value || document.querySelector('[data-field="checkout-name"]')?.value;
            const address = document.querySelector('[name="address"]')?.value || document.querySelector('[data-field="checkout-address"]')?.value;
            const city = document.querySelector('[name="city"]')?.value || document.querySelector('[data-field="checkout-city"]')?.value;
            const paymentMethodInput = document.querySelector('input[name="payment_method"]:checked') || document.querySelector('input[name="paymentMethod"]:checked');
            const paymentMethod = paymentMethodInput?.value || 'stripe';
            const walletNumber = document.querySelector('[name="wallet_number"]')?.value;

            if (!email || !name || !address) throw new Error('Please fill in required fields');
            
            // Validation for wallets
            if ((paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && !walletNumber) {
                const err = 'Please enter your mobile number for wallet payment';
                showToast(err);
                if (checkoutBtn) {
                    checkoutBtn.textContent = checkoutBtn.getAttribute('data-original-text');
                    checkoutBtn.disabled = false;
                }
                throw new Error(err);
            }

            const cart = getCart();
            const body = {
                items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
                customerEmail: email,
                shippingAddress: { name, address, city },
                paymentMethod,
                walletNumber,
                createAccount,
                password: createAccount ? password : null
            };

            const coupon = getAppliedCoupon();
            if (coupon && coupon.valid) body.couponCode = coupon.code;

            // 2. Create Payment Intent
            const res = await api('/checkout/create-payment-intent', { method: 'POST', body });

            // Dispatch order placed event
            document.dispatchEvent(new CustomEvent('wfc:order-placed', { detail: { orderId: res.orderId, total: getCartTotal() } }));

            if (res.method === 'cod') {
                showToast('Order placed successfully! (COD)');
                localStorage.removeItem(CART_KEY);
                setTimeout(() => window.location.href = 'success.html?order=' + res.orderId, 1500);
                return;
            }

            // 3. Confirm Stripe Payment
            if (res.method === 'stripe') {
                if (!stripeInstance || !cardElement) throw new Error('Payment iframe not initialized');

                const result = await stripeInstance.confirmCardPayment(res.clientSecret, {
                    payment_method: {
                        card: cardElement,
                        billing_details: { name, email }
                    }
                });

                if (result.error) {
                    throw new Error(result.error.message);
                } else {
                    if (result.paymentIntent.status === 'succeeded') {
                        showToast('Payment successful!');
                        localStorage.removeItem(CART_KEY);
                        window.location.href = 'success.html?order=' + res.orderId;
                    }
                }
            }
        } catch (error) {
            showToast(error.message);
            if (checkoutBtn) { checkoutBtn.textContent = 'Complete Purchase'; checkoutBtn.disabled = false; }
        }
    }

    // --- Wishlist ---
    function getLocalWishlist() {
        try { return JSON.parse(localStorage.getItem('wfc_wishlist') || '[]'); } catch { return []; }
    }

    function saveLocalWishlist(list) {
        localStorage.setItem('wfc_wishlist', JSON.stringify(list));
    }

    function getWishlistMap() {
        try { return JSON.parse(localStorage.getItem('wfc_wishlist_map') || '{}'); } catch { return {}; }
    }

    function saveWishlistMap(map) {
        localStorage.setItem('wfc_wishlist_map', JSON.stringify(map));
    }

    async function toggleWishlist(productId) {
        const token = getCustomerToken();
        if (token) {
            // API wishlist
            try {
                const items = getLocalWishlist();
                const map = getWishlistMap();
                
                // Resolve: if productId is a slug, find its UUID from the map
                let resolvedId = productId;
                let isInWishlist = items.includes(productId);
                
                if (!isInWishlist && map[productId] && items.includes(map[productId])) {
                    // productId is a slug, and its mapped UUID is in the wishlist
                    isInWishlist = true;
                    resolvedId = map[productId]; // Use the UUID for the API call
                }

                if (isInWishlist) {
                    await api(`/customer/wishlist/${resolvedId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    showToast('Removed from wishlist');
                } else {
                    await api('/customer/wishlist', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: { productId } });
                    showToast('Added to wishlist');
                }
                // Always sync from server to ensure IDs and Slugs are perfectly shared
                await syncWishlist();
            } catch (e) {
                showToast('Wishlist error from API: ' + e.message);
            }
        } else {
            // Local wishlist (guest)
            const items = getLocalWishlist();
            const map = getWishlistMap();
            
            // Find if either this ID/Slug OR its mapped counterpart exists in the list
            let existingIdx = items.indexOf(productId);
            if (existingIdx === -1 && map[productId]) {
                existingIdx = items.indexOf(map[productId]);
            }

            if (existingIdx > -1) {
                items.splice(existingIdx, 1);
                showToast('Removed from wishlist');
            } else {
                items.push(productId);
                showToast('Added to wishlist');
            }
            saveLocalWishlist([...new Set(items)]);
        }
        updateWishlistIcons();
    }

    function updateWishlistIcons() {
        const items = getLocalWishlist();
        const map = getWishlistMap();
        document.querySelectorAll('[data-commerce="wishlist-toggle"]').forEach(btn => {
            let pid = btn.getAttribute('data-product-id');
            // If ID not on button (removed for independence), check parent
            if (!pid || pid === '{{id}}') {
                pid = btn.closest('[data-product-id]')?.getAttribute('data-product-id');
            }
            if (!pid) return;
            
            // Check if ID is in wishlist OR if it's a slug mapped to an ID in wishlist
            const isWished = items.includes(pid) || (map[pid] && items.includes(map[pid]));
            btn.classList.toggle('wfc-wishlisted', isWished);

            if (!btn.querySelector('svg') && !btn.querySelector('span')) {
                btn.innerHTML = isWished ? '&#9829;' : '&#9825;';
            }
        });
    }

    // Sync wishlist from API on login
    async function syncWishlist() {
        const token = getCustomerToken();
        if (!token) return;
        try {
            const data = await api('/customer/wishlist', { headers: { 'Authorization': `Bearer ${token}` } });
            if (data.wishlist) {
                const ids = [];
                const map = getWishlistMap();
                data.wishlist.forEach(item => {
                    if (item.productId) {
                        ids.push(item.productId);
                        if (item.slug) {
                            map[item.slug] = item.productId;
                            map[item.productId] = item.slug;
                        }
                    }
                });
                saveLocalWishlist([...new Set(ids)]);
                saveWishlistMap(map);
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
            // Check if input already exists in HTML
            let input = container.querySelector('input');
            if (!input) {
                input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Search products...';
                input.className = 'wfc-search-input';
                container.appendChild(input);
            }

            let results = container.querySelector('.wfc-search-results');
            if (!results) {
                results = document.createElement('div');
                results.className = 'wfc-search-results';
                container.appendChild(results);
            }

            container.style.position = 'relative';

            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const q = input.value.trim();
                if (q.length < 2) { results.innerHTML = ''; results.style.display = 'none'; return; }

                searchTimeout = setTimeout(async () => {
                    try {
                        const data = await api(`/public/search?q=${encodeURIComponent(q)}`);
                        if (data.results.length === 0) {
                            results.innerHTML = '<div class="wfc-search-empty">No products found</div>';
                        } else {
                            results.innerHTML = data.results.map(p => {
                                const price = p.salePrice
                                    ? `<span class="wfc-original-price">${CURRENCY_SYMBOL}${p.price.toFixed(2)}</span> ${CURRENCY_SYMBOL}${p.salePrice.toFixed(2)} `
                                    : `${CURRENCY_SYMBOL}${p.price.toFixed(2)} `;
                                return `<a href="product.html?slug=${p.slug}" class="wfc-search-item">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" class="wfc-search-img">` : '<div class="wfc-search-img wfc-placeholder"></div>'}
        <div class="wfc-search-info">
            <div class="wfc-search-title">${p.title}</div>
            <div class="wfc-search-price">${price}</div>
        </div>
                                </a> `;
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
    function bindButtons(scope = document) {
        console.log('[CommerceEngine] bindButtons for scope:', scope === document ? 'document' : scope.tagName || scope);
        scope.querySelectorAll('[data-commerce="add-to-cart"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                let productId = btn.getAttribute('data-product-id');
                if (!productId || productId === '{{id}}') {
                    productId = btn.closest('[data-product-id]')?.getAttribute('data-product-id');
                }
                if (!productId) return;

                const detail = btn.closest('[data-commerce="product-detail"]') || btn.closest('.product-card') || document;
                const variantId = detail.querySelector('[data-commerce="variant-select"]')?.value || null;
                const qtyId = btn.getAttribute('data-qty-id');
                let qtyInput = qtyId ? document.getElementById(qtyId) : null;
                if (!qtyInput) {
                    qtyInput = detail.querySelector('[data-commerce="quantity-input"]') || document.querySelector('[data-commerce="quantity-input"]');
                }
                const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

                const parent = btn.closest('[data-product-id]') || btn.closest('.product-card') || btn.closest('[data-field="title"]')?.parentElement || btn;
                const title = detail.querySelector('[data-field="title"]')?.textContent || 'Product';

                const priceEl = detail.querySelector('[data-field="price"]');
                const saleEl = priceEl?.querySelector('.wfc-sale-price');
                const priceText = (saleEl || priceEl)?.textContent || '0';
                const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
                const imageEl = detail.querySelector('[data-field="image"]');
                const imageUrl = imageEl ? (imageEl.src || imageEl.style.backgroundImage?.slice(5, -2) || '') : '';

                // NEW QUANTITY LOGIC for standard buttons
                // The `quantity` and `qtyId` variables are already declared and assigned above in demo-site/engine.js 
                // We just need to use them in the addToCart call.

                addToCart(productId, variantId, title, price, imageUrl, quantity);
            });
        });

        scope.querySelectorAll('[data-commerce="cart-toggle"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); showCart(); });

            // Auto-inject count badge if data-show-count="true"
            if (btn.getAttribute('data-show-count') === 'true' && !btn.querySelector('.wfc-auto-count')) {
                const badge = document.createElement('span');
                badge.className = 'wfc-auto-count';
                const count = getCartCount();
                badge.textContent = count;
                if (count === 0) badge.style.display = 'none';
                btn.appendChild(badge);
            }
        });

        scope.querySelectorAll('[data-commerce="checkout-btn"], [data-commerce="checkout-submit"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); checkout(); });
        });

        // Customer login buttons
        scope.querySelectorAll('[data-commerce="customer-login"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); showAuthModal('login'); });
        });

        // Customer register buttons
        scope.querySelectorAll('[data-commerce="customer-register"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); showAuthModal('register'); });
        });        // Login Page Redirects
        scope.querySelectorAll('[data-commerce="customer-login-page"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('href') || '/login';
                // Append current page as redirect param
                const currentPath = window.location.pathname + window.location.search;
                const finalUrl = target + (target.includes('?') ? '&' : '?') + 'redirect=' + encodeURIComponent(currentPath);
                window.location.href = finalUrl;
            });
        });

;

        // Account link (for logged-in users)
        scope.querySelectorAll('[data-commerce="account-link"]').forEach(el => {
            if (el.__commerceBound) return;
            el.__commerceBound = true;
            // No preventDefault - allow navigation to href (account.html)
        });

        // Logout buttons
        scope.querySelectorAll('[data-commerce="customer-logout"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
        });

        // Wishlist toggle buttons
        scope.querySelectorAll('[data-commerce="wishlist-toggle"]').forEach(btn => {
            if (btn.__commerceBound) return;
            btn.__commerceBound = true;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                let productId = btn.getAttribute('data-product-id');
                if (!productId || productId === '{{id}}') {
                    const detail = btn.closest('[data-commerce="product-detail"]') || btn.closest('[data-product-id]');
                    if (detail) productId = detail.getAttribute('data-product-id');
                }
                if (productId) toggleWishlist(productId);
                else showToast('Wishlist error: Button not linked to product HTML');
            });
        });
    }

    // --- Styles ---
    function getCartStyles() {
        return `
        #wf-commerce-cart { display: none; }
        #wf-commerce-cart.wfc-open { display: block; }
      
      .wfc-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); z-index: 99998; cursor: pointer;
            backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
            animation: wfcFadeIn 0.25s ease;
        }
      
      .wfc-sidebar {
            position: fixed; top: 0; right: 0; width: 440px; max-width: 92vw; height: 100%;
            background: #ffffff; z-index: 99999; display: flex; flex-direction: column;
            box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12); animation: wfcSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      
      .wfc-sidebar-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 28px 28px 20px 28px; border-bottom: 1px solid #f0f0f0;
        }
      .wfc-sidebar-header h3 { margin: 0; font-size: 22px; font-weight: 700; color: #111; letter-spacing: -0.02em; }
      .wfc-cart-subtitle { margin: 4px 0 0 0; font-size: 13px; color: #999; font-weight: 400; }
      
      .wfc-close {
            background: #f5f5f5; border: none; cursor: pointer;
            color: #666; padding: 10px; line-height: 1; transition: all 0.2s;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
      .wfc-close:hover { background: #eee; color: #111; transform: rotate(90deg); }
      
      .wfc-sidebar-body { flex: 1; overflow-y: auto; padding: 8px 28px; }
      .wfc-sidebar-body::-webkit-scrollbar { width: 4px; }
      .wfc-sidebar-body::-webkit-scrollbar-track { background: transparent; }
      .wfc-sidebar-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
      
      .wfc-cart-item {
            display: flex; gap: 16px; padding: 20px 0;
            border-bottom: 1px solid #f5f5f5; position: relative;
            transition: background 0.2s;
        }
      .wfc-item-img-wrap {
            width: 80px; height: 80px; border-radius: 16px; overflow: hidden;
            background: #f8f8f8; flex-shrink: 0; position: relative;
        }
      .wfc-item-img {
            width: 100%; height: 100%; object-fit: cover;
        }
      .wfc-placeholder { background: linear-gradient(135deg, #f5f5f5, #eee); width: 100%; height: 100%; }
      .wfc-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
      .wfc-item-title { font-weight: 600; font-size: 14px; color: #111; line-height: 1.3; }
      .wfc-item-price { font-size: 14px; color: #444; display: flex; align-items: center; gap: 6px; }
      .wfc-current-price { font-weight: 600; color: #111; }
      .wfc-original-price { text-decoration: line-through; color: #bbb; font-size: 13px; }
      .wfc-sale-price { color: #e53e3e; font-weight: 600; }
      
      .wfc-item-qty {
            display: inline-flex; align-items: center; gap: 0;
            border: 1px solid #e8e8e8; border-radius: 999px; width: fit-content;
            overflow: hidden; background: #fafafa;
        }
      .wfc-item-qty button {
            background: none; border: none; width: 32px; height: 32px;
            cursor: pointer; color: #555; transition: all 0.15s;
            display: flex; align-items: center; justify-content: center;
        }
      .wfc-item-qty button:hover { background: var(--aura-theme); color: #fff; }
      .wfc-item-qty span { width: 28px; text-align: center; font-size: 13px; font-weight: 600; color: #111; }
      
      .wfc-remove {
            position: absolute; top: 20px; right: 0; background: none; border: none;
            color: #ccc; cursor: pointer; padding: 6px; border-radius: 8px;
            transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        }
      .wfc-remove:hover { color: var(--aura-theme, #e53e3e); background: var(--aura-glow, #fef2f2); transform: scale(1.1) rotate(5deg); }
      
      .wfc-empty-cart {
            text-align: center; padding: 80px 20px; color: #bbb;
            display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
      .wfc-empty-cart p { font-size: 16px; font-weight: 600; color: #999; margin: 0; }
      .wfc-empty-cart span { font-size: 13px; color: #bbb; }
      
      .wfc-sidebar-footer {
            padding: 20px 28px 28px 28px; border-top: 1px solid #f0f0f0;
            background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
        }
      
      .wfc-coupon-row { display: flex; gap: 8px; margin-bottom: 16px; }
      .wfc-coupon-input {
            flex: 1; padding: 10px 14px; border: 1px solid #e8e8e8; border-radius: 10px;
            font-size: 13px; text-transform: uppercase; outline: none;
            background: #fff; transition: border-color 0.2s; letter-spacing: 0.05em;
        }
      .wfc-coupon-input:focus { border-color: var(--aura-theme); }
      .wfc-coupon-btn {
            padding: 10px 18px; background: var(--aura-theme); border: none; border-radius: 10px;
            font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            color: #fff; letter-spacing: 0.02em;
        }
      .wfc-coupon-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      .wfc-coupon-applied { margin-bottom: 12px; }
      .wfc-coupon-tag {
            display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px;
            background: #ecfdf5; color: #059669; border-radius: 999px; font-size: 13px; font-weight: 600;
        }
      .wfc-coupon-tag button {
            background: none; border: none; color: #059669; cursor: pointer; font-size: 16px; padding: 0; line-height: 1;
        }
 
      .wfc-price-breakdown {
            padding: 16px 0; margin-bottom: 4px;
        }
      .wfc-divider {
            height: 1px; background: #f0f0f0; margin: 10px 0;
        }
      
      .wfc-subtotal, .wfc-total, .wfc-discount-row {
            display: flex; justify-content: space-between; margin-bottom: 6px;
            font-size: 14px; color: #888;
        }
      .wfc-total { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 0; margin-top: 4px; }
      .wfc-discount-amount { color: #059669; font-weight: 600; }
      
      .wfc-checkout-btn {
            width: 100%; padding: 16px; background: var(--aura-theme);
            color: #fff; border: none; border-radius: 14px; font-size: 15px; font-weight: 600;
            cursor: pointer; transition: all 0.3s; display: flex; align-items: center;
            justify-content: center; gap: 10px; letter-spacing: 0.02em;
        }
      .wfc-checkout-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 24px var(--aura-glow); }
      .wfc-checkout-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
      
      .wfc-view-cart-btn {
            display: flex; align-items: center; justify-content: center;
            width: 100%; padding: 14px; margin-bottom: 12px;
            border: 2px solid var(--aura-theme); color: var(--aura-theme);
            border-radius: 14px; font-size: 15px; font-weight: 600;
            text-decoration: none; transition: all 0.3s;
        }
      .wfc-view-cart-btn:hover { background: var(--aura-theme); color: #fff; }
      
      .wfc-secure-note {
            display: flex; align-items: center; justify-content: center; gap: 6px;
            font-size: 12px; color: #bbb; margin: 14px 0 0 0; font-weight: 400;
        }
      
      .wfc-toast {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
            background: #111; color: #fff; padding: 12px 24px; border-radius: 8px;
            font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            z-index: 100000; opacity: 0; transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      .wfc-toast-show { opacity: 1; transform: translateX(-50%) translateY(0); }
      
      .wfc-in-stock { color: #38a169; font-weight: 500; }
      .wfc-out-of-stock { color: #e53e3e; font-weight: 500; }
      
      .wfc-variant-group { margin-bottom: 16px; }
      .wfc-variant-group label { display: block; font-weight: 500; margin-bottom: 8px; text-transform: capitalize; }
      .wfc-variant-options { display: flex; gap: 8px; flex-wrap: wrap; }
      .wfc-variant-btn {
            padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px;
            background: #fff; cursor: pointer; font-size: 14px; transition: all 0.2s;
        }
      .wfc-variant-btn:hover { border-color: #111; }
      .wfc-variant-btn.active { background: #111; color: #fff; border-color: #111; }

      /* Color swatch variant buttons */
      .wfc-color-btn {
            width: 36px; height: 36px; padding: 0; border-radius: 50%;
            border: 2px solid #ddd; position: relative;
        }
      .wfc-color-btn.active { border-color: #111; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
      .wfc-color-btn:hover { border-color: #888; }

      /* Variant info display */
      .wfc-variant-info {
            display: none; justify-content: space-between; align-items: center;
            padding: 10px 14px; background: #f8fafc; border-radius: 6px;
            margin-top: 12px; font-size: 14px;
        }
      .wfc-variant-selected { font-weight: 600; color: #111; }
      .wfc-variant-price { font-weight: 600; color: #111; }
      .wfc-variant-hint { color: #999; font-style: italic; }
      .wfc-variant-label { font-weight: 500; margin-bottom: 8px; text-transform: capitalize; }

      /* Variant label in cart items */
      .wfc-item-variant { font-size: 12px; color: #888; margin-bottom: 4px; }

        /* Wishlist */
        [data-commerce="wishlist-toggle"] {
            background: none; border: none; cursor: pointer; font-size: 22px;
            color: #ccc; transition: all 0.2s; padding: 4px; line-height: 1;
        }
        [data-commerce="wishlist-toggle"]:hover { color: #e53e3e; transform: scale(1.1); }
        [data-commerce="wishlist-toggle"].wfc-wishlisted { color: #e53e3e; }

      /* Search */
      .wfc-search-input {
        }
      .wfc-search-input:focus { border-color: #111; }
      .wfc-search-results {
            display: none; position: absolute; top: 100%; left: 0; right: 0;
            background: #fff; border: 1px solid #ddd; border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); z-index: 1000;
            max-height: 400px; overflow-y: auto; margin-top: 4px;
        }
      .wfc-search-item {
            display: flex; align-items: center; gap: 12px; padding: 10px 14px;
            text-decoration: none; color: inherit; transition: background 0.15s;
        }
      .wfc-search-item:hover { background: #f5f5f5; }
      .wfc-search-img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #f5f5f5; }
      .wfc-search-info { flex: 1; min-width: 0; }
      .wfc-search-title { font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .wfc-search-price { font-size: 13px; color: #666; margin-top: 2px; }
      .wfc-search-empty { padding: 20px; text-align: center; color: #999; font-size: 14px; }

      /* Badges */
      .wfc-badge {
            display: inline-block; padding: 4px 10px; border-radius: 4px;
            font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
      .wfc-badge-sale { background: #fee2e2; color: #dc2626; }
      .wfc-badge-soldout { background: #e5e7eb; color: #6b7280; }
      .wfc-badge-featured { background: #fef3c7; color: #d97706; }

      /* Stars */
      .wfc-stars { display: inline-flex; gap: 1px; font-size: 16px; }
      .wfc-star-full { color: #f59e0b; }
      .wfc-star-half { color: #f59e0b; opacity: 0.6; }
      .wfc-star-empty { color: #d1d5db; }
      .wfc-review-count { margin-left: 6px; font-size: 13px; color: #6b7280; }

      /* Category filter */
      .wfc-category-list { display: flex; flex-direction: column; gap: 4px; }
      .wfc-cat-btn {
            display: flex; justify-content: space-between; align-items: center;
            width: 100%; padding: 10px 14px; border: none; background: none;
            text-align: left; cursor: pointer; font-size: 14px; color: #444;
            border-radius: 6px; transition: all 0.2s;
        }
      .wfc-cat-btn:hover { background: #f5f5f5; color: #111; }
      .wfc-cat-btn.active { background: #111; color: #fff; font-weight: 500; }
      .wfc-cat-child { padding-left: 28px; font-size: 13px; }
      .wfc-cat-count { font-size: 12px; color: #999; font-weight: 400; }
      .wfc-cat-btn.active.wfc-cat-count { color: rgba(255, 255, 255, 0.7); }

      /* Category tags on products */
      .wfc-category-tag {
            display: inline-block; padding: 2px 8px; background: #f3f4f6; border-radius: 4px;
            font-size: 12px; color: #666; margin: 0 4px 4px 0;
        }

      /* Gallery */
      .wfc-gallery-img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; margin: 4px; border: 2px solid transparent; transition: border-color 0.2s; }
      .wfc-gallery-img:hover { border-color: #111; }

      /* Reviews */
      .wfc-review { padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
      .wfc-review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
      .wfc-review-title { font-weight: 600; margin-bottom: 4px; }
      .wfc-review-content { color: #555; font-size: 14px; line-height: 1.5; margin: 0; }
      .wfc-review-date { color: #999; font-size: 12px; }
      .wfc-no-reviews { color: #999; text-align: center; padding: 20px; }

      /* Auth Modal */
      .wfc-auth-modal { display: none; }
      .wfc-auth-modal.wfc-open { display: block; }
      .wfc-auth-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 99998; cursor: pointer;
        }
      .wfc-auth-box {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; border-radius: 12px; padding: 32px; width: 380px; max-width: 90vw;
            z-index: 99999; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            animation: wfcFadeIn 0.2s ease;
        }
      .wfc-auth-tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
      .wfc-auth-tab {
            flex: 1; padding: 10px; border: none; background: none; cursor: pointer;
            font-size: 15px; font-weight: 500; color: #999; transition: all 0.2s;
            border-bottom: 2px solid transparent; margin-bottom: -2px;
        }
      .wfc-auth-tab.active { color: #111; border-bottom-color: #111; }
      .wfc-auth-input {
            width: 100%; padding: 12px 14px; border: 1px solid #ddd; border-radius: 8px;
            font-size: 14px; margin-bottom: 12px; outline: none; transition: border-color 0.2s;
            box-sizing: border-box;
        }
      .wfc-auth-input:focus { border-color: #111; }
      .wfc-auth-error { color: #e53e3e; font-size: 13px; margin-bottom: 12px; }
      .wfc-auth-submit {
            width: 100%; padding: 14px; background: #111; color: #fff; border: none;
            border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;
            transition: all 0.2s;
        }
      .wfc-auth-submit:hover { background: #333; }
      .wfc-auth-submit:disabled { background: #999; cursor: not-allowed; }

        @keyframes wfcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wfcSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes wfcShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

        /* Skeleton Loaders */
        .wfc-skeleton-wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; width: 100%; }
        .wfc-skeleton-card { border-radius: 12px; overflow: hidden; background: #f5f5f5; }
        .wfc-skeleton-img { width: 100%; height: 220px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 800px 100%; animation: wfcShimmer 1.5s infinite linear; }
        .wfc-skeleton-text { height: 16px; margin: 16px; border-radius: 4px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 800px 100%; animation: wfcShimmer 1.5s infinite linear; }
        .wfc-skeleton-short { width: 40%; height: 14px; }

        /* Product Filter Panel */
        .wfc-product-filter { font-family: inherit; }
        .wfc-filter-horizontal { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding: 16px 0; border-bottom: 1px solid #f0f0f0; margin-bottom: 24px; }
        .wfc-filter-vertical { display: flex; flex-direction: column; gap: 24px; padding: 20px; background: #fafafa; border-radius: 12px; }
        .wfc-filter-group { display: flex; align-items: center; gap: 8px; }
        .wfc-filter-vertical .wfc-filter-group { flex-direction: column; align-items: flex-start; }
        .wfc-filter-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #888; white-space: nowrap; }
        .wfc-filter-cat-list { display: flex; gap: 6px; flex-wrap: wrap; }
        .wfc-filter-vertical .wfc-filter-cat-list { flex-direction: column; gap: 4px; }
        .wfc-filter-cat { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: #f0f0f0; color: #555; white-space: nowrap; }
        .wfc-filter-cat:hover { background: #e0e0e0; }
        .wfc-filter-cat.active { background: var(--aura-theme, #111); color: #fff; }
        .wfc-filter-count { font-size: 11px; opacity: 0.7; }
        .wfc-price-range { display: flex; align-items: center; gap: 6px; }
        .wfc-price-input { width: 80px; padding: 7px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; outline: none; font-family: inherit; }
        .wfc-price-input:focus { border-color: var(--aura-theme, #111); }
        .wfc-price-sep { color: #ccc; font-size: 14px; }
        .wfc-price-go { padding: 7px 14px; background: var(--aura-theme, #111); color: #fff; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .wfc-price-go:hover { opacity: 0.85; }
        .wfc-sort-select { padding: 7px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-family: inherit; outline: none; background: #fff; cursor: pointer; min-width: 140px; }
        .wfc-sort-select:focus { border-color: var(--aura-theme, #111); }
        .wfc-filter-result-count { font-size: 13px; color: #888; font-weight: 500; white-space: nowrap; }
        .wfc-filter-horizontal .wfc-filter-result { margin-left: auto; }

        @media(max-width: 480px) {
        .wfc-sidebar { width: 100%; }
      .wfc-auth-box { width: 90vw; padding: 24px; }
        .wfc-skeleton-wrap { grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .wfc-checkout-split { grid-template-columns: 1fr !important; }
        }

        /* ═══ Complete UI Component Styles ═══ */

        /* Form Elements */
        .wfc-form-input { width: 100%; padding: 12px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; font-family: inherit; }
        .wfc-form-input:focus { border-color: var(--aura-theme, #111); }
        /* Auth Form Elements */
        .wfc-auth-submit-btn {
            width: 100%; padding: 14px; background: var(--aura-theme, #111); color: #fff; 
            border: none; border-radius: 8px; font-size: 15px; font-weight: 600; 
            cursor: pointer; transition: all 0.2s;
        }
        .wfc-auth-submit-btn:hover { background: #000; }
        .wfc-auth-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .wfc-forgot-password-link:hover { text-decoration: underline !important; }

        .wfc-form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #555; }
        .wfc-form-group { margin-bottom: 16px; min-width: 0; }
        .wfc-checkout-block { margin-bottom: 32px; }
        .wfc-checkout-block-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .wfc-step-num { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--aura-theme, #111); color: #fff; border-radius: 50%; font-size: 14px; font-weight: 700; }
        .wfc-checkout-block-header h3 { font-size: 20px; font-weight: 700; margin: 0; color: #111; font-family: 'Playfair Display', serif; }
        .wfc-form-row { display: flex; gap: 16px; margin-bottom: 16px; }
        .wfc-form-row .wfc-form-group { margin-bottom: 0; flex: 1; min-width: 0; }
        .wfc-form-section { margin-bottom: 28px; }
        .wfc-form-section-title { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #111; }
        
        .wfc-create-account-toggle { margin-top: 24px; padding-top: 20px; border-top: 1px solid #eaeaea; }
        .wfc-checkbox-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; color: #444; margin-bottom: 12px; }
        .wfc-checkbox-label input[type="checkbox"] { margin-top: 4px; accent-color: var(--aura-theme, #111); width: 16px; height: 16px; }
        .wfc-password-field { padding: 16px; background: #fafafa; border-radius: 8px; border: 1px solid #eaeaea; margin-top: 12px; animation: wfcFadeIn 0.3s ease; }

        /* Checkout UI */
        .wfc-checkout-split { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; }
        .wfc-checkout-stacked { max-width: 640px; }
        .wfc-checkout-title { font-size: 24px; font-weight: 800; margin: 0 0 28px 0; }
        .wfc-checkout-form { min-width: 0; }
        .wfc-checkout-summary { background: #fafafa; border-radius: 16px; padding: 28px; position: sticky; top: 24px; }
        .wfc-summary-title { font-size: 18px; font-weight: 700; margin: 0 0 20px 0; }
        .wfc-summary-items { margin-bottom: 20px; }
        .wfc-summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #666; }
        .wfc-summary-total { font-size: 18px; font-weight: 800; color: #111; }
        .wfc-summary-divider { height: 1px; background: #e0e0e0; margin: 8px 0; }
        .wfc-coupon-section { display: flex; gap: 8px; margin: 16px 0; }
        .wfc-coupon-apply { padding: 12px 20px; background: var(--aura-theme, #111); color: #fff; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; }
        .wfc-coupon-apply:hover { opacity: 0.9; }
        .wfc-checkout-submit-btn { display: block; width: 100%; padding: 16px; background: var(--aura-theme, #111); color: #fff; border-radius: 12px; font-size: 16px; font-weight: 700; text-align: center; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
        .wfc-checkout-submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Payment Options */
        .wfc-payment-options { display: flex; flex-direction: column; gap: 10px; }
        .wfc-payment-option { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 1px solid #e0e0e0; border-radius: 10px; cursor: pointer; transition: border-color 0.2s; }
        .wfc-payment-option:has(input:checked) { border-color: var(--aura-theme, #111); background: #f8f8f8; }
        .wfc-payment-label { font-size: 14px; font-weight: 500; }
        .wfc-stripe-mount { margin-top: 12px; padding: 14px; border: 1px solid #e0e0e0; border-radius: 8px; min-height: 20px; }

        /* Multi-Step */
        .wfc-step-indicator { display: flex; gap: 0; margin-bottom: 32px; border-bottom: 2px solid #f0f0f0; }
        .wfc-step { flex: 1; padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #999; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; cursor: pointer; }
        .wfc-step.active { color: var(--aura-theme, #111); border-bottom-color: var(--aura-theme, #111); }
        .wfc-step-content { display: none; }
        .wfc-step-content.active { display: block; }
        .wfc-step-next, .wfc-step-back { display: inline-block; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .wfc-step-next { background: var(--aura-theme, #111); color: #fff; }
        .wfc-step-next:hover { opacity: 0.9; }
        .wfc-step-back { background: #f0f0f0; color: #666; }
        .wfc-step-back:hover { background: #e0e0e0; }
        .wfc-step-nav { display: flex; justify-content: space-between; margin-top: 24px; }

        /* Cart UI */
        .wfc-cart-page-title { font-size: 24px; font-weight: 800; margin: 0 0 24px 0; }
        .wfc-cart-page-footer { margin-top: 24px; }
        .wfc-cart-coupon-area { display: flex; gap: 8px; margin-bottom: 20px; max-width: 360px; }
        .wfc-cart-totals { max-width: 360px; margin-left: auto; }
        .wfc-cart-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .wfc-continue-shopping { color: #666; font-size: 14px; text-decoration: none; font-weight: 500; }
        .wfc-continue-shopping:hover { color: #111; }
        .wfc-proceed-checkout { padding: 14px 32px; background: var(--aura-theme, #111); color: #fff; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .wfc-proceed-checkout:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Account UI */
        .wfc-account-dashboard { max-width: 800px; }
        .wfc-account-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }
        .wfc-account-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--aura-theme, #111); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; flex-shrink: 0; }
        .wfc-account-name { font-size: 20px; font-weight: 800; margin: 0; }
        .wfc-account-email { font-size: 13px; color: #888; margin: 2px 0 0 0; }
        .wfc-account-logout { margin-left: auto; padding: 8px 20px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; color: #666; transition: all 0.2s; }
        .wfc-account-logout:hover { border-color: #e53e3e; color: #e53e3e; }
        .wfc-account-tabs { display: flex; gap: 0; border-bottom: 2px solid #f0f0f0; margin-bottom: 24px; }
        .wfc-account-tab { padding: 10px 20px; font-size: 14px; font-weight: 500; color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .wfc-account-tab.active { color: var(--aura-theme, #111); border-bottom-color: var(--aura-theme, #111); }
        .wfc-account-panel { display: none; }
        .wfc-account-panel.active { display: block; }
        .wfc-account-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .wfc-stat-card { background: #fafafa; border-radius: 12px; padding: 24px; text-align: center; }
        .wfc-stat-value { display: block; font-size: 32px; font-weight: 800; color: var(--aura-theme, #111); }
        .wfc-stat-label { display: block; font-size: 13px; color: #888; margin-top: 4px; }
        .wfc-order-card { padding: 16px; border: 1px solid #f0f0f0; border-radius: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .wfc-order-header { display: flex; align-items: center; gap: 12px; }
        .wfc-order-id { font-weight: 700; font-size: 14px; }
        .wfc-order-date { font-size: 13px; color: #888; }
        .wfc-order-status { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .wfc-status-pending { background: #fff3cd; color: #856404; }
        .wfc-status-processing { background: #cce5ff; color: #004085; }
        .wfc-status-completed { background: #d4edda; color: #155724; }
        .wfc-status-cancelled { background: #f8d7da; color: #721c24; }
        .wfc-order-total { font-weight: 800; font-size: 16px; }
        .wfc-address-card { padding: 16px; border: 1px solid #f0f0f0; border-radius: 10px; margin-bottom: 10px; }
        .wfc-address-card p { margin: 4px 0 8px 0; color: #666; font-size: 14px; }
        .wfc-addr-delete { font-size: 13px; color: #e53e3e; cursor: pointer; font-weight: 500; }
        .wfc-addr-delete:hover { text-decoration: underline; }
        .wfc-add-address-btn { display: inline-block; margin-top: 12px; padding: 10px 20px; background: #f5f5f5; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .wfc-add-address-btn:hover { background: #e8e8e8; }
        .wfc-address-form { margin-top: 16px; padding: 20px; background: #fafafa; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; }
        .wfc-addr-actions { display: flex; gap: 10px; margin-top: 8px; }
        .wfc-addr-save { padding: 10px 20px; background: var(--aura-theme, #111); color: #fff; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .wfc-addr-cancel { padding: 10px 20px; background: #e0e0e0; color: #666; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }
        .wfc-profile-save, .wfc-pw-save { display: inline-block; padding: 12px 24px; background: var(--aura-theme, #111); color: #fff; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: all 0.2s; }
        .wfc-profile-save:hover, .wfc-pw-save:hover { opacity: 0.9; }
        .wfc-empty-state { color: #999; text-align: center; padding: 24px; font-size: 14px; }
        .wfc-account-login-prompt { text-align: center; padding: 60px 20px; }
        .wfc-account-login-btn { display: inline-block; padding: 14px 32px; background: var(--aura-theme, #111); color: #fff; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 16px; }

        `;
    }

    // ═══════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════
    // Phase 6: CHECKOUT PAGE & BLOCKS
    // ═══════════════════════════════════════════════════════
    function renderCheckoutPage() {
        // Support both new "checkout-page" and legacy "checkout-ui"
        const containers = document.querySelectorAll('[data-commerce="checkout-page"], [data-commerce="checkout-ui"]');
        if (containers.length === 0) return;

        containers.forEach(container => {
            if (container.__wfcRendered) return;
            container.__wfcRendered = true;

            const skin = container.getAttribute('data-skin') || 'default';

            container.innerHTML = `
                <div class="wfc-checkout-split wfc-skin-${skin}">
                    <div class="wfc-checkout-form">
                        <div class="wfc-checkout-header">
                            <h2 class="wfc-checkout-title">Checkout</h2>
                        </div>
                        <div class="wfc-checkout-block">
                            <div class="wfc-checkout-block-header"><span class="wfc-step-num">1</span> <h3>Contact Details</h3></div>
                            <div data-commerce="checkout-contact"></div>
                        </div>
                        <div class="wfc-checkout-block">
                            <div class="wfc-checkout-block-header"><span class="wfc-step-num">2</span> <h3>Delivery Information</h3></div>
                            <div data-commerce="checkout-delivery"></div>
                        </div>
                        <div class="wfc-checkout-block">
                            <div class="wfc-checkout-block-header"><span class="wfc-step-num">3</span> <h3>Payment Method</h3></div>
                            <div data-commerce="checkout-payment"></div>
                        </div>
                    </div>
                    <div data-commerce="checkout-summary"></div>
                </div>`;

            // Render modular blocks inside
            renderCheckoutBlocks(container);
            bindButtons(container);
            renderCartUI();
        });
    }

    function renderCheckoutBlocks(scope) {
        const root = scope || document;

                // --- CHECKOUT-CONTACT block ---
        root.querySelectorAll('[data-commerce="checkout-contact"]').forEach(el => {
            if (el.__wfcRendered) return;
            el.__wfcRendered = true;

            el.innerHTML = `
                <div class="wfc-form-section">
                    <div class="wfc-form-group">
                        <label class="wfc-form-label">Email</label>
                        <input type="email" name="email" class="wfc-form-input" placeholder="your@email.com" required />
                    </div>
                    <div class="wfc-create-account-toggle">
                        <label class="wfc-checkbox-label">
                            <input type="checkbox" class="wfc-create-account-check" />
                            <span>Create an account for faster checkout</span>
                        </label>
                        <div class="wfc-password-field" style="display:none">
                            <label class="wfc-form-label">Password</label>
                            <input type="password" name="password" class="wfc-form-input" placeholder="Choose a password" />
                        </div>
                    </div>
                </div>`;

            // Toggle password field on checkbox
            const check = el.querySelector('.wfc-create-account-check');
            const pwField = el.querySelector('.wfc-password-field');
            if (check && pwField) {
                check.addEventListener('change', () => {
                    pwField.style.display = check.checked ? 'block' : 'none';
                });
            }
        });

        // --- CHECKOUT-DELIVERY block ---
        root.querySelectorAll('[data-commerce="checkout-delivery"]').forEach(el => {
            if (el.__wfcRendered) return;
            el.__wfcRendered = true;
            
            const showPhone = el.getAttribute('data-phone') !== 'false';
            const showCompany = el.getAttribute('data-company') === 'true'; // Optional by default
            const showNotes = el.getAttribute('data-notes') !== 'false';

            let html = `<div class="wfc-form-section">
                    <h3 class="wfc-form-section-title">Delivery Information</h3>
                    <div class="wfc-form-group">
                        <label class="wfc-form-label">Full Name</label>
                        <input type="text" name="fullName" class="wfc-form-input" placeholder="John Doe" required />
                    </div>`;
                    
            if (showCompany) {
                html += `<div class="wfc-form-group">
                        <label class="wfc-form-label">Company (Optional)</label>
                        <input type="text" name="company" class="wfc-form-input" placeholder="Company Name" />
                    </div>`;
            }

            if (showPhone) {
                html += `<div class="wfc-form-group">
                        <label class="wfc-form-label">Phone</label>
                        <input type="tel" name="phone" class="wfc-form-input" placeholder="+1 234 567 890" />
                    </div>`;
            }

            html += `<div class="wfc-form-group">
                        <label class="wfc-form-label">Address</label>
                        <input type="text" name="address" class="wfc-form-input" placeholder="123 Main St" required />
                    </div>
                    <div class="wfc-form-row">
                        <div class="wfc-form-group wfc-form-half">
                            <label class="wfc-form-label">City</label>
                            <input type="text" name="city" class="wfc-form-input" placeholder="New York" required />
                        </div>
                        <div class="wfc-form-group wfc-form-half">
                            <label class="wfc-form-label">Postal Code</label>
                            <input type="text" name="postalCode" class="wfc-form-input" placeholder="10001" />
                        </div>
                    </div>
                    <div class="wfc-form-group">
                        <label class="wfc-form-label">Country</label>
                        <input type="text" name="country" class="wfc-form-input" placeholder="United States" />
                    </div>`;
                    
            if (showNotes) {
                html += `<div class="wfc-form-group" style="margin-top: 24px;">
                        <label class="wfc-form-label">Order Notes (Optional)</label>
                        <textarea name="notes" class="wfc-form-input" rows="3" placeholder="Special instructions for delivery..."></textarea>
                    </div>`;
            }

            html += `</div>`;
            el.innerHTML = html;
        });

        // --- CHECKOUT-PAYMENT block ---
        root.querySelectorAll('[data-commerce="checkout-payment"]').forEach(el => {
            if (el.__wfcRendered) return;
            el.__wfcRendered = true;

            el.innerHTML = `
                <div class="wfc-form-section">
                    <h3 class="wfc-form-section-title">Payment Method</h3>
                    <div class="wfc-payment-options">
                        <label class="wfc-payment-option">
                            <input type="radio" name="paymentMethod" value="cod" checked />
                            <span class="wfc-payment-label">💵 Cash on Delivery</span>
                        </label>
                        <label class="wfc-payment-option">
                            <input type="radio" name="paymentMethod" value="card" />
                            <span class="wfc-payment-label">💳 Credit / Debit Card</span>
                        </label>
                    </div>
                    <div id="card-element" class="wfc-stripe-mount"></div>
                </div>`;

            // Mount Stripe if card selected
            el.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    const cardEl = el.querySelector('#card-element');
                    if (radio.value === 'card' && cardEl && !cardElement) {
                        mountStripeElements('card-element');
                    }
                });
            });
        });

        // --- CHECKOUT-SUMMARY block ---
        root.querySelectorAll('[data-commerce="checkout-summary"]').forEach(el => {
            if (el.__wfcRendered) return;
            el.__wfcRendered = true;

            const showItems = el.getAttribute('data-items') !== 'false';
            const showSubtotal = el.getAttribute('data-subtotal') !== 'false';
            const showDiscount = el.getAttribute('data-discount') !== 'false';
            const showCoupon = el.getAttribute('data-coupon') !== 'false';

            let html = '<div class="wfc-checkout-summary"><h3 class="wfc-summary-title">Order Summary</h3>';

            if (showItems) {
                html += '<div data-commerce="cart-items" class="wfc-summary-items"></div>';
            }
            if (showSubtotal) {
                html += '<div class="wfc-summary-row"><span>Subtotal</span><span data-commerce="cart-subtotal">' + CURRENCY_SYMBOL + '0.00</span></div>';
            }
            if (showDiscount) {
                html += '<div class="wfc-summary-row wfc-discount-row-ui" style="display:none"><span>Discount</span><span data-commerce="cart-discount">-' + CURRENCY_SYMBOL + '0.00</span></div>';
            }
            html += '<div class="wfc-summary-divider"></div>';
            html += '<div class="wfc-summary-row wfc-summary-total"><span>Total</span><span data-commerce="cart-total">' + CURRENCY_SYMBOL + '0.00</span></div>';

            if (showCoupon) {
                html += '<div class="wfc-coupon-section"><input type="text" id="coupon-input" class="wfc-form-input" placeholder="Coupon code" /><span class="coupon-apply-btn wfc-coupon-apply">Apply</span></div>';
            }

            html += '<span data-commerce="checkout-submit" class="wfc-checkout-submit-btn">Complete Order</span></div>';

            el.innerHTML = html;

            // Bind coupon apply
            const couponBtn = el.querySelector('.coupon-apply-btn');
            const couponInput = el.querySelector('#coupon-input');
            if (couponBtn && couponInput) {
                couponBtn.addEventListener('click', async () => {
                    const code = couponInput.value.trim();
                    if (!code) return;
                    couponBtn.textContent = '...';
                    try {
                        const cart = getCart();
                        const data = await api('/public/cart/validate', {
                            method: 'POST',
                            body: {
                                items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
                                couponCode: code
                            }
                        });
                        if (data.discount && data.discount.valid) {
                            saveAppliedCoupon(data.discount);
                            showToast('Coupon applied!');
                            couponInput.value = '';
                            renderCartUI();
                        } else {
                            showToast(data.discount?.error || 'Invalid coupon');
                        }
                    } catch (e) {
                        showToast('Could not validate coupon');
                    }
                    couponBtn.textContent = 'Apply';
                });
            }
        });
    }

    // Phase 7: CART PAGE & SIDEBAR
    // ═══════════════════════════════════════════════════════
    function renderCartPage() {
        // Support both new "cart-page" and legacy "cart-ui"
        const containers = document.querySelectorAll('[data-commerce="cart-page"], [data-commerce="cart-ui"]');
        if (containers.length === 0) return;

        containers.forEach(container => {
            if (container.__wfcRendered) return;
            container.__wfcRendered = true;

            const skin = container.getAttribute('data-skin') || 'default';
            const style = container.getAttribute('data-style') || 'full';

            container.innerHTML = `
                <div class="wfc-cart-page wfc-cart-${style} wfc-skin-${skin}">
                    <h2 class="wfc-cart-page-title">Shopping Cart</h2>
                    <div data-commerce="cart-items" class="wfc-cart-items-list"></div>
                    <div class="wfc-cart-page-footer">
                        <div class="wfc-cart-coupon-area">
                            <input type="text" id="coupon-input" class="wfc-form-input" placeholder="Coupon code" />
                            <span class="coupon-apply-btn wfc-coupon-apply">Apply</span>
                        </div>
                        <div class="wfc-cart-totals">
                            <div class="wfc-summary-row"><span>Subtotal</span><span data-commerce="cart-subtotal">${CURRENCY_SYMBOL}0.00</span></div>
                            <div class="wfc-summary-row wfc-discount-row-ui" style="display:none"><span>Discount</span><span data-commerce="cart-discount">-${CURRENCY_SYMBOL}0.00</span></div>
                            <div class="wfc-summary-divider"></div>
                            <div class="wfc-summary-row wfc-summary-total"><span>Total</span><span data-commerce="cart-total">${CURRENCY_SYMBOL}0.00</span></div>
                        </div>
                        <div class="wfc-cart-actions">
                            <a href="shop.html" class="wfc-continue-shopping">← Continue Shopping</a>
                            <span data-commerce="checkout-btn" class="wfc-proceed-checkout">Proceed to Checkout →</span>
                        </div>
                    </div>
                </div>`;

            // Bind coupon
            const couponBtn = container.querySelector('.coupon-apply-btn');
            const couponInput = container.querySelector('#coupon-input');
            if (couponBtn && couponInput) {
                couponBtn.addEventListener('click', async () => {
                    const code = couponInput.value.trim();
                    if (!code) return;
                    couponBtn.textContent = '...';
                    try {
                        const cart = getCart();
                        const data = await api('/public/cart/validate', {
                            method: 'POST',
                            body: {
                                items: cart.items.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
                                couponCode: code
                            }
                        });
                        if (data.discount && data.discount.valid) {
                            saveAppliedCoupon(data.discount);
                            showToast('Coupon applied!');
                            couponInput.value = '';
                            renderCartUI();
                        } else {
                            showToast(data.discount?.error || 'Invalid coupon');
                        }
                    } catch (e) {
                        showToast('Could not validate coupon');
                    }
                    couponBtn.textContent = 'Apply';
                });
            }

            bindButtons(container);
            renderCartUI();
        });
    }

    // ═══════════════════════════════════════════════════════
    
    // Phase 10: CUSTOMER ACCOUNT (MODULAR & PLUG-AND-PLAY)
    // ═══════════════════════════════════════════════════════
    async function loadAccountState() {
        if (!isLoggedIn()) return null;
        try {
            const [profile, orders, addresses, wishlist] = await Promise.all([
                api('/customer/profile'),
                api('/customer/orders'),
                api('/customer/addresses'),
                api('/customer/wishlist')
            ]);
            return {
                customer: profile.customer,
                orders: orders.orders || [],
                addresses: addresses.addresses || [],
                wishlist: wishlist.wishlist || [],
                wishlistCount: (wishlist.wishlist || []).length
            };
        } catch (e) {
            console.error('[CommerceEngine] Failed to load account state:', e);
            return null;
        }
    }

    async function renderAccountBlocks() {
        const state = await loadAccountState();
        if (!state) return;

        const { customer, orders, addresses, wishlist, wishlistCount } = state;

        // 1. Profile Blocks (Form Auto-fill)
        document.querySelectorAll('[data-commerce="account-profile"]').forEach(block => {
            // Fill data-fields
            block.querySelectorAll('[data-field="customer-name"]').forEach(el => el.textContent = customer.firstName || customer.email.split('@')[0]);
            block.querySelectorAll('[data-field="customer-email"]').forEach(el => el.textContent = customer.email);
            block.querySelectorAll('[data-field="customer-phone"]').forEach(el => el.textContent = customer.phone || 'No phone set');
            block.querySelectorAll('[data-field="customer-initial"]').forEach(el => el.textContent = (customer.firstName || customer.email).charAt(0).toUpperCase());

            // Fill Inputs
            const fnInput = block.querySelector('#wfc-profile-firstname') || block.querySelector('[name="firstName"]');
            const lnInput = block.querySelector('#wfc-profile-lastname') || block.querySelector('[name="lastName"]');
            const phInput = block.querySelector('#wfc-profile-phone') || block.querySelector('[name="phone"]');
            if (fnInput) fnInput.value = customer.firstName || '';
            if (lnInput) lnInput.value = customer.lastName || '';
            if (phInput) phInput.value = customer.phone || '';

            // Handle Submit if exists
            const saveBtn = block.querySelector('.wfc-profile-save') || block.querySelector('[data-commerce="account-profile-submit"]');
            if (saveBtn && !saveBtn.__commerceBound) {
                saveBtn.__commerceBound = true;
                saveBtn.addEventListener('click', async () => {
                    const body = {
                        firstName: fnInput?.value,
                        lastName: lnInput?.value,
                        phone: phInput?.value
                    };
                    try {
                        await api('/customer/profile', { method: 'PUT', body });
                        showToast('Profile updated!');
                        renderAccountBlocks(); renderAccountPage(); // Refresh
                    } catch (e) { showToast('Update failed'); }
                });
            }
        });

        // 2. Orders History (Modular List)
        document.querySelectorAll('[data-commerce="account-orders"]').forEach(container => {
            if (container.__wfcRendered) return;
            // container.__wfcRendered = true; // Don't block refresh, just handle template

            const template = container.querySelector('[data-commerce="order-item"]');
            if (!template) return;

            // Remove previous instances but keep template hidden
            Array.from(container.children).forEach(child => { if (child !== template) child.remove(); });
            template.style.display = 'none';

            if (orders.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'wfc-empty-state';
                empty.textContent = 'No orders found.';
                container.appendChild(empty);
                return;
            }

            orders.forEach(order => {
                const clone = template.cloneNode(true);
                clone.style.display = '';
                clone.removeAttribute('data-commerce');
                
                // Fill details
                const shortId = order.id.substring(0, 8).toUpperCase();
                const dateStr = new Date(order.createdAt).toLocaleDateString();
                const totalStr = CURRENCY_SYMBOL + parseFloat(order.totalAmount || 0).toFixed(2);
                const status = order.status || 'Pending';

                clone.innerHTML = clone.innerHTML
                    .replace(/{{shortId}}/g, shortId)
                    .replace(/{{id}}/g, order.id)
                    .replace(/{{date}}/g, dateStr)
                    .replace(/{{total}}/g, totalStr)
                    .replace(/{{status}}/g, status);

                // Field level updates
                clone.querySelectorAll('[data-order-field="id"]').forEach(el => el.textContent = '#' + shortId);
                clone.querySelectorAll('[data-order-field="date"]').forEach(el => el.textContent = dateStr);
                clone.querySelectorAll('[data-order-field="total"]').forEach(el => el.textContent = totalStr);
                clone.querySelectorAll('[data-order-field="status"]').forEach(el => {
                    el.textContent = status;
                    el.className = 'wfc-order-status wfc-status-' + status.toLowerCase();
                });

                container.appendChild(clone);
            });
        });

        // 3. Address Blocks (Modular)
        document.querySelectorAll('[data-commerce="account-addresses"]').forEach(container => {
            const template = container.querySelector('[data-commerce="address-item"]');
            if (!template) return;
            Array.from(container.children).forEach(child => { if (child !== template) child.remove(); });
            template.style.display = 'none';

            addresses.forEach(addr => {
                const clone = template.cloneNode(true);
                clone.style.display = '';
                clone.querySelectorAll('[data-address-field="label"]').forEach(el => el.textContent = addr.label || 'Address');
                clone.querySelectorAll('[data-address-field="street"]').forEach(el => el.textContent = addr.street || '');
                clone.querySelectorAll('[data-address-field="city"]').forEach(el => el.textContent = (addr.city || '') + ' ' + (addr.zip || ''));
                
                const delBtn = clone.querySelector('[data-commerce="address-delete"]');
                if (delBtn) {
                    delBtn.addEventListener('click', async () => {
                        await api(`/customer/addresses/${addr.id}`, { method: 'DELETE' });
                        showToast('Address removed');
                        renderAccountBlocks();
                    });
                }
                container.appendChild(clone);
            });
        });

        // 4. Stats
        document.querySelectorAll('[data-commerce="account-stats"]').forEach(block => {
            block.querySelectorAll('[data-stat="orders-count"]').forEach(el => el.textContent = orders.length);
            block.querySelectorAll('[data-stat="addresses-count"]').forEach(el => el.textContent = addresses.length);
            block.querySelectorAll('[data-stat="wishlist-count"]').forEach(el => el.textContent = wishlistCount);
        });
    }

    async function renderProductPage() {
        const containers = document.querySelectorAll('[data-commerce="product-page"]');
        if (containers.length === 0) return;

        // Inject Styles
        if (!document.getElementById('ce-product-page-styles')) {
            const style = document.createElement('style');
            style.id = 'ce-product-page-styles';
            style.textContent = getProductPageStyles();
            document.head.appendChild(style);
        }

        for (const container of containers) {
            if (container.__ceRendered) continue;
            container.__ceRendered = true;

            const productId = container.getAttribute('data-product-id');
            const productSlug = container.getAttribute('data-product-slug') || new URLSearchParams(window.location.search).get('slug');

            if (!productId && !productSlug) {
                container.innerHTML = '<div style="padding:100px; text-align:center;"><h3>Product Not Found</h3><p>Please provide a product ID or slug.</p></div>';
                continue;
            }

            try {
                const data = await api(`/public/products/${productId || productSlug}`);
                const product = data.product;
                if (!product) throw new Error('Product not found');

                renderProductPageUI(container, product);
                trackViewedProduct(product.id);
            } catch (err) {
                console.error('[CommerceEngine] Product Page Error:', err);
                container.innerHTML = `<div style="padding:100px; text-align:center;"><h3>Error Loading Product</h3><p>${err.message}</p></div>`;
            }
        }
    }

    function renderProductPageUI(container, product) {
        const symbol = CURRENCY_SYMBOL;
        const mainImage = getImageUrl(product.imageUrl);
        const images = product.images || [product.imageUrl];
        
        container.innerHTML = `
            <div class="ce-product-page-wrapper">
                <div class="ce-product-grid">
                    <!-- Left: Gallery -->
                    <div class="ce-product-gallery">
                        <div class="ce-main-image-wrap">
                            <img src="${mainImage}" id="ce-main-img" alt="${product.title}">
                        </div>
                        <div class="ce-thumbnails">
                            ${images.map((img, i) => `
                                <div class="ce-thumb ${i === 0 ? 'active' : ''}" onclick="document.getElementById('ce-main-img').src = '${getImageUrl(img)}'; this.parentElement.querySelectorAll('.ce-thumb').forEach(t => t.classList.remove('active')); this.classList.add('active');">
                                    <img src="${getImageUrl(img)}">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Right: Info -->
                    <div class="ce-product-info">
                        <nav class="ce-breadcrumb">
                            <a href="shop.html">Shop</a> / <span>${product.category || 'Collection'}</span>
                        </nav>
                        
                        <h1 class="ce-product-title">${product.title}</h1>
                        
                        <div class="ce-product-price-row">
                            <span class="ce-price">${symbol}${product.price}</span>
                            ${product.salePrice ? `<span class="ce-old-price">${symbol}${product.salePrice}</span>` : ''}
                            ${product.onSale ? '<span class="ce-sale-badge">SALE</span>' : ''}
                        </div>

                        <div class="ce-product-description">
                            ${product.description || 'No description available for this premium piece.'}
                        </div>

                        ${product.variants && product.variants.length > 0 ? `
                            <div class="ce-product-variants">
                                <label class="ce-variant-label">Select Option</label>
                                <div class="ce-variant-options">
                                    ${product.variants.map(v => `
                                        <button class="ce-variant-pill" onclick="this.parentElement.querySelectorAll('.ce-variant-pill').forEach(p => p.classList.remove('active')); this.classList.add('active');">
                                            ${v.name}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="ce-product-actions">
                            <div class="ce-qty-selector">
                                <button onclick="const input = this.nextElementSibling; input.value = Math.max(1, parseInt(input.value) - 1);">-</button>
                                <input type="number" value="1" id="ce-buy-qty">
                                <button onclick="const input = this.previousElementSibling; input.value = parseInt(input.value) + 1;">+</button>
                            </div>
                        </div>

                        <div class="ce-main-buttons">
                            <button class="ce-add-to-cart-btn" data-commerce="add-to-cart" data-product-id="${product.id}" onclick="const qty = document.getElementById('ce-buy-qty').value; window.__commerceEngine.addToCart('${product.id}', parseInt(qty));">
                                Add to Cart
                            </button>
                            <button class="ce-wishlist-toggle-btn ${getWishlistMap()[product.id] ? 'active' : ''}" onclick="window.__commerceEngine.toggleWishlist('${product.id}'); this.classList.toggle('active');">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </button>
                        </div>

                        <div class="ce-trust-badges">
                            <div class="ce-trust-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                <span>Premium Security</span>
                            </div>
                            <div class="ce-trust-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                                <span>Complimentary Shipping</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="ce-product-tabs">
                    <div class="ce-tabs-nav">
                        <span class="ce-tab-link active" onclick="this.parentElement.querySelectorAll('.ce-tab-link').forEach(l => l.classList.remove('active')); this.classList.add('active');">Details</span>
                        <span class="ce-tab-link" onclick="this.parentElement.querySelectorAll('.ce-tab-link').forEach(l => l.classList.remove('active')); this.classList.add('active');">Shipping</span>
                    </div>
                    <div class="ce-tab-content">
                        <p>Composition: 100% Technical Nylon. Crafted for endurance and style.</p>
                    </div>
                </div>
            </div>
        `;
        bindButtons(container);
    }

    function getProductPageStyles() {
        return `
            .ce-product-page-wrapper { font-family: 'Inter', sans-serif; background: #fff; padding: 60px 5%; max-width: 1400px; margin: 0 auto; color: #111; }
            .ce-product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
            
            /* Gallery */
            .ce-main-image-wrap { background: #f9f9f9; border-radius: 32px; overflow: hidden; aspect-ratio: 4/5; cursor: zoom-in; }
            .ce-main-image-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
            .ce-main-image-wrap:hover img { transform: scale(1.05); }
            
            .ce-thumbnails { display: flex; gap: 15px; margin-top: 20px; }
            .ce-thumb { width: 80px; height: 80px; border-radius: 12px; overflow: hidden; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; opacity: 0.6; }
            .ce-thumb.active { border-color: var(--aura-theme, #F27D26); opacity: 1; }
            .ce-thumb img { width: 100%; height: 100%; object-fit: cover; }

            /* Right Info */
            .ce-breadcrumb { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 20px; font-weight: 800; }
            .ce-breadcrumb a { color: #999; text-decoration: none; transition: color 0.2s; }
            .ce-breadcrumb a:hover { color: #111; }
            
            .ce-product-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; margin-bottom: 20px; letter-spacing: -0.02em; line-height: 1.1; }
            
            .ce-product-price-row { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; }
            .ce-price { font-size: 28px; font-weight: 900; color: #111; }
            .ce-old-price { font-size: 20px; text-decoration: line-through; color: #ccc; }
            .ce-sale-badge { background: var(--aura-theme, #F27D26); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 900; letter-spacing: 0.05em; }
            
            .ce-product-description { font-size: 16px; line-height: 1.7; color: #666; margin-bottom: 40px; }
            
            .ce-variant-label { display: block; font-size: 11px; text-transform: uppercase; font-weight: 800; color: #999; margin-bottom: 12px; letter-spacing: 0.1em; }
            .ce-variant-options { display: flex; gap: 10px; margin-bottom: 40px; }
            .ce-variant-pill { padding: 12px 24px; border: 1.5px solid #eee; background: #fff; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; }
            .ce-variant-pill:hover { border-color: #111; }
            .ce-variant-pill.active { background: #111; color: #fff; border-color: #111; }
            
            .ce-product-actions { display: flex; gap: 20px; margin-bottom: 30px; }
            .ce-qty-selector { display: flex; align-items: center; border: 1.5px solid #eee; border-radius: 15px; overflow: hidden; }
            .ce-qty-selector button { padding: 15px 20px; border: none; background: #fff; font-size: 18px; cursor: pointer; transition: background 0.2s; }
            .ce-qty-selector button:hover { background: #f5f5f5; }
            .ce-qty-selector input { width: 50px; text-align: center; border: none; font-size: 16px; font-weight: 800; outline: none; }
            
            .ce-main-buttons { display: flex; gap: 15px; margin-bottom: 40px; }
            .ce-add-to-cart-btn { flex: 1; padding: 22px; background: #111; color: #fff; border: none; border-radius: 18px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
            .ce-add-to-cart-btn:hover { background: var(--aura-theme, #F27D26); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(242, 125, 38, 0.2); }
            
            .ce-wishlist-toggle-btn { width: 65px; border: 1.5px solid #eee; border-radius: 18px; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #999; }
            .ce-wishlist-toggle-btn.active { color: #ff4757; background: #fff1f2; border-color: #ff4757; }
            
            .ce-trust-badges { display: flex; gap: 30px; padding-top: 30px; border-top: 1px solid #f5f5f5; }
            .ce-trust-item { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #aaa; letter-spacing: 0.05em; }
            
            /* Tabs */
            .ce-product-tabs { margin-top: 80px; border-top: 1px solid #eee; }
            .ce-tabs-nav { display: flex; gap: 40px; }
            .ce-tab-link { padding: 30px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #ccc; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.3s; }
            .ce-tab-link.active { color: #111; border-color: #111; }
            .ce-tab-content { padding: 40px 0; font-size: 15px; line-height: 1.8; color: #666; max-width: 800px; }

            @media (max-width: 1100px) {
                .ce-product-grid { grid-template-columns: 1fr; gap: 40px; }
                .ce-product-title { font-size: 36px; }
            }
        `;
    }

    async function renderWishlistPage() {
        const containers = document.querySelectorAll('[data-commerce="wishlist-page"]');
        if (containers.length === 0) return;

        // Inject Styles
        if (!document.getElementById('ce-wishlist-page-styles')) {
            const style = document.createElement('style');
            style.id = 'ce-wishlist-page-styles';
            style.textContent = getWishlistPageStyles();
            document.head.appendChild(style);
        }

        for (const container of containers) {
            if (container.__ceRendered) continue;
            container.__ceRendered = true;

            const wishlistMap = getWishlistMap();
            const productIds = Object.keys(wishlistMap);

            if (productIds.length === 0) {
                renderWishlistEmpty(container);
                continue;
            }

            try {
                const data = await api(`/public/products?ids=${productIds.join(',')}`);
                renderWishlistUI(container, data.products || []);
            } catch (err) {
                console.error('[CommerceEngine] Wishlist Page Error:', err);
                container.innerHTML = `<div style="padding:100px; text-align:center;"><h3>Error Loading Wishlist</h3><p>${err.message}</p></div>`;
            }
        }
    }

    function renderWishlistEmpty(container) {
        container.innerHTML = `
            <div class="ce-wishlist-empty">
                <div class="ce-empty-icon">❤️</div>
                <h2 class="ce-empty-title">Your Wishlist is Empty</h2>
                <p class="ce-empty-subtitle">Save your favorite premium pieces here to keep track of what you love.</p>
                <a href="shop.html" class="ce-btn-primary" style="text-decoration:none; display:inline-block; padding: 14px 40px; border-radius:12px;">Explore Collection</a>
            </div>
        `;
    }

    function renderWishlistUI(container, products) {
        const symbol = CURRENCY_SYMBOL;
        container.innerHTML = `
            <div class="ce-wishlist-wrapper">
                <header class="ce-wishlist-header">
                    <h1 class="ce-wishlist-title">My Wishlist</h1>
                    <p class="ce-wishlist-subtitle">${products.length} items saved to your collection</p>
                </header>
                <div class="ce-wishlist-grid">
                    ${products.map(p => `
                        <div class="ce-wish-card">
                            <div class="ce-wish-img-wrap">
                                <img src="${getImageUrl(p.imageUrl)}" alt="${p.title}">
                                <button class="ce-wish-remove-btn" onclick="AuraEngine.toggleWishlist('${p.id}'); AuraEngine.refresh();">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div class="ce-wish-info">
                                <h3 class="ce-wish-name">${p.title}</h3>
                                <div class="ce-wish-price">${symbol}${p.price}</div>
                                <button class="ce-wish-add-btn" onclick="AuraEngine.addToCart('${p.id}', null, '${p.title}', ${p.price}, '${p.imageUrl}')">
                                    Add to Bag
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function getWishlistPageStyles() {
        return `
            .ce-wishlist-wrapper { font-family: 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; padding: 40px 20px 100px; }
            .ce-wishlist-header { text-align: center; margin-bottom: 60px; }
            .ce-wishlist-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; margin-bottom: 12px; letter-spacing: -0.02em; }
            .ce-wishlist-subtitle { color: #999; font-size: 16px; }

            .ce-wishlist-empty { text-align: center; padding: 120px 20px; font-family: 'Inter', sans-serif; }
            .ce-empty-icon { font-size: 64px; margin-bottom: 24px; opacity: 0.5; }
            .ce-empty-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 800; margin-bottom: 12px; }
            .ce-empty-subtitle { color: #888; margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto; }

            .ce-wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
            .ce-wish-card { background: #fff; border-radius: 24px; border: 1px solid #f0f0f0; overflow: hidden; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); }
            .ce-wish-card:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(0,0,0,0.05); }

            .ce-wish-img-wrap { position: relative; aspect-ratio: 1/1; background: #f8f8f8; overflow: hidden; }
            .ce-wish-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
            .ce-wish-card:hover .ce-wish-img-wrap img { transform: scale(1.05); }
            .ce-wish-remove-btn { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: #fff; border: none; display: flex; align-items: center; justify-content: center; color: #999; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index:10; }
            .ce-wish-remove-btn:hover { color: #ff4d4d; transform: scale(1.1); }

            .ce-wish-info { padding: 24px; text-align: center; }
            .ce-wish-name { font-size: 18px; font-weight: 800; margin-bottom: 8px; color: #111; }
            .ce-wish-price { font-size: 16px; color: #666; font-weight: 600; margin-bottom: 20px; }
            .ce-wish-add-btn { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
            .ce-wish-add-btn:hover { background: var(--aura-theme, #F27D26); transform: translateY(-2px); }

            @media (max-width: 640px) {
                .ce-wishlist-title { font-size: 36px; }
                .ce-wishlist-grid { grid-template-columns: 1fr; }
            }
        `;
    }

    async function renderAccountHub() {
        console.log('[CommerceEngine] renderAccountHub starting...');
        const containers = document.querySelectorAll('[data-commerce="account-hub"]');
        console.log('[CommerceEngine] Found Account Hub containers:', containers.length);
        if (containers.length === 0) return;

        // Inject Styles early to prevent FOUC
        if (!document.getElementById('ce-hub-styles')) {
            console.log('[CommerceEngine] Injecting Account Hub styles');
            const style = document.createElement('style');
            style.id = 'ce-hub-styles';
            style.textContent = getAccountHubStyles();
            document.head.appendChild(style);
        }

        // Show Loading State
        containers.forEach(c => {
            console.log('[CommerceEngine] Setting loading state for container');
            if (!c.innerHTML.trim()) {
                c.innerHTML = `<div class="ce-hub-loading" style="padding: 80px; text-align: center; color: #999;">
                    <div class="ce-spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--aura-theme, #F27D26); border-radius: 50%; margin: 0 auto 20px; animation: ce-spin 1s linear infinite;"></div>
                    <p style="font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 11px;">Authenticating Portal...</p>
                </div>`;
            }
        });

        // Redirect if not logged in
        if (!isLoggedIn()) {
             containers.forEach(c => {
                 c.innerHTML = `
                    <div class="ce-auth-prompt" style="padding: 100px 20px; text-align: center; background: #fff; border-radius: 32px; border: 1px solid #f0f0f0; box-shadow: 0 40px 100px rgba(0,0,0,0.03);">
                        <div style="font-size: 48px; margin-bottom: 24px;">🔐</div>
                        <h2 style="font-size: 32px; font-weight: 900; margin-bottom: 12px; color: #111;">Access Your Account</h2>
                        <p style="color: #666; margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto;">Please sign in to view your orders, manage addresses, and update your profile settings.</p>
                        <button data-commerce="customer-login" class="ce-tab-btn active" style="width: auto; padding: 16px 48px; margin: 0 auto; display: flex;">Sign In to Portal</button>
                    </div>
                 `;
             });
             bindButtons();
             return;
        }

        const state = await loadAccountState();
        if (!state) {
            // If logged in but state is null, token might be invalid/expired
            containers.forEach(c => {
                c.innerHTML = `
                    <div class="ce-auth-prompt" style="padding: 100px 20px; text-align: center; background: #fff; border-radius: 32px; border: 1px solid #f0f0f0;">
                        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 12px; color: #111;">Session Expired</h2>
                        <p style="color: #666; margin-bottom: 32px;">Your session has timed out. Please sign in again.</p>
                        <button data-commerce="customer-logout" class="ce-tab-btn active" style="width: auto; padding: 14px 40px; margin: 0 auto; display: flex;">Clear Session & Log In</button>
                    </div>
                `;
            });
            bindButtons();
            return;
        }

        const { customer, orders, addresses, wishlist, wishlistCount } = state;

        containers.forEach(container => {
            // Remove the __wfcRendered block to allow refresh, or only skip if content is full
            // container.__wfcRendered = true; 

            const layout = container.getAttribute('data-layout') || 'vertical';
            const hide = (container.getAttribute('data-hide') || '').split(',').map(s => s.trim().toLowerCase());
            const skin = container.getAttribute('data-skin') || 'aura';
            const primaryColor = container.getAttribute('data-primary-color') || '#F27D26';
            const accentColor = container.getAttribute('data-accent-color') || 'rgba(242, 125, 38, 0.1)';

            // Apply brand variables directly to container
            container.style.setProperty('--aura-theme', primaryColor);
            container.style.setProperty('--aura-glow', accentColor);

            // Filter Tabs
            const tabs = [
                { id: 'overview', label: '📊 Overview' },
                { id: 'orders', label: '📦 Order History' },
                { id: 'addresses', label: '📍 Saved Addresses' },
                { id: 'profile', label: '👤 Profile Settings' },
                { id: 'wishlist', label: '❤️ My Wishlist' }
            ].filter(t => !hide.includes(t.id));

            const isHorizontal = layout === 'horizontal';
            const layoutClass = isHorizontal ? 'ce-layout-horizontal' : 'ce-layout-vertical';

            const resolveImageUrl = (url) => {
                if (!url) return 'https://via.placeholder.com/150';
                if (url.startsWith('http')) return url;
                const cleanPath = url.replace(/^\/+/, '');
                if (cleanPath.startsWith('uploads/')) return `${API_BASE}/${cleanPath}`;
                return `${API_BASE}/uploads/${cleanPath}`;
            };

            // Global helper for order details
            window.AuraEngine = window.AuraEngine || {};
            window.AuraEngine.showOrderDetail = async (orderId) => {
                const panel = container.querySelector('[data-hub-panel="orders"]');
                if (!panel) return;

                const order = orders.find(o => o.id === orderId);
                if (!order) return;

                const listContainer = panel.querySelector('.ce-orders-list');
                const originalTitle = panel.querySelector('.ce-panel-title').innerText;
                
                // Save original view if not already saved
                if (!panel.dataset.listView) {
                    panel.dataset.listView = listContainer.innerHTML;
                    panel.dataset.listTitle = originalTitle;
                }

                panel.querySelector('.ce-panel-title').innerHTML = `
                    <div class="ce-detail-header">
                        <button class="ce-back-btn" onclick="AuraEngine.hideOrderDetail(this)">← Back</button>
                        <span>Order Details</span>
                    </div>
                `;

                listContainer.innerHTML = `
                    <div class="ce-order-detail-view">
                        <div class="ce-detail-top">
                            <div class="ce-detail-main">
                                <h3>Order #${order.id.substring(0,8).toUpperCase()}</h3>
                                <p>${new Date(order.createdAt).toLocaleLongDate?.() || new Date(order.createdAt).toLocaleDateString()} at ${new Date(order.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <div class="ce-status-pill status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</div>
                        </div>

                        <div class="ce-detail-items">
                            ${(order.items || []).map(item => `
                                <div class="ce-detail-item">
                                    <img src="${resolveImageUrl(item.product?.featuredImage)}" alt="${item.productTitle}" />
                                    <div class="ce-item-info">
                                        <div class="ce-item-name">${item.productTitle}</div>
                                        <div class="ce-item-meta">Qty: ${item.quantity} • ${CURRENCY_SYMBOL}${parseFloat(item.unitPrice).toFixed(2)} each</div>
                                    </div>
                                    <div class="ce-item-total">${CURRENCY_SYMBOL}${parseFloat(item.totalPrice).toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="ce-detail-summary">
                            <div class="ce-summary-row"><span>Subtotal</span><span>${CURRENCY_SYMBOL}${parseFloat(order.subtotal).toFixed(2)}</span></div>
                            <div class="ce-summary-row"><span>Shipping</span><span>${CURRENCY_SYMBOL}${parseFloat(order.shippingAmount).toFixed(2)}</span></div>
                            <div class="ce-summary-row"><span>Tax</span><span>${CURRENCY_SYMBOL}${parseFloat(order.taxAmount).toFixed(2)}</span></div>
                            ${parseFloat(order.discountAmount) > 0 ? `<div class="ce-summary-row ce-discount"><span>Discount</span><span>-${CURRENCY_SYMBOL}${parseFloat(order.discountAmount).toFixed(2)}</span></div>` : ''}
                            <div class="ce-summary-row ce-total-row"><span>Total</span><span>${CURRENCY_SYMBOL}${parseFloat(order.totalAmount).toFixed(2)}</span></div>
                        </div>

                        <div class="ce-detail-footer">
                            <button class="ce-btn-secondary" onclick="alert('Printing order...')">🖨️ Print Receipt</button>
                            ${order.status === 'completed' ? `<button class="ce-btn-outline">🛡️ Request Return</button>` : ''}
                        </div>
                    </div>
                `;
            };

            window.AuraEngine.hideOrderDetail = (btn) => {
                const panel = container.querySelector('[data-hub-panel="orders"]');
                if (!panel || !panel.dataset.listView) return;
                
                panel.querySelector('.ce-panel-title').innerText = panel.dataset.listTitle;
                panel.querySelector('.ce-orders-list').innerHTML = panel.dataset.listView;
                delete panel.dataset.listView;
            };

            container.innerHTML = `
                <div class="ce-account-hub ${layoutClass} ce-skin-${skin}">
                    <div class="ce-hub-sidebar">
                        <div class="ce-user-profile">
                            <div class="ce-avatar">${(customer.firstName || customer.email).charAt(0).toUpperCase()}</div>
                            <div class="ce-user-details">
                                <h4 class="ce-name">${customer.firstName || customer.email.split('@')[0]}</h4>
                                <p class="ce-email">${customer.email}</p>
                            </div>
                        </div>
                        <nav class="ce-hub-nav">
                            ${tabs.map((t, i) => `
                                <button class="ce-tab-btn ${i === 0 ? 'active' : ''}" data-hub-tab="${t.id}">
                                    ${t.label}
                                </button>
                            `).join('')}
                            <div class="ce-nav-divider"></div>
                            <button data-commerce="customer-logout" class="ce-logout-btn">
                                🔒 Sign Out
                            </button>
                        </nav>
                    </div>
                    <div class="ce-hub-content">
                        <!-- Overview Panel -->
                        ${!hide.includes('overview') ? `
                        <div class="ce-panel active" data-hub-panel="overview">
                            <h2 class="ce-panel-title">Account Hub</h2>
                            <p class="ce-panel-subtitle">Welcome back, ${customer.firstName || 'Elite Member'}.</p>
                            
                             <div class="ce-stats-grid">
                                <div class="ce-stat-card">
                                    <span class="ce-stat-val">${orders.length}</span>
                                    <span class="ce-stat-lbl">Total Orders</span>
                                </div>
                                <div class="ce-stat-card">
                                    <span class="ce-stat-val">${wishlistCount}</span>
                                    <span class="ce-stat-lbl">Wishlist</span>
                                </div>
                                <div class="ce-stat-card">
                                    <span class="ce-stat-val">${getCart().items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                                    <span class="ce-stat-lbl">Cart Items</span>
                                </div>
                                <div class="ce-stat-card">
                                    <span class="ce-stat-val">${CURRENCY_SYMBOL}${orders.reduce((acc, o) => acc + parseFloat(o.totalAmount || 0), 0).toFixed(2)}</span>
                                    <span class="ce-stat-lbl">Total Spent</span>
                                </div>
                            </div>

                            <div class="ce-overview-split">
                                <div class="ce-quick-view">
                                    <div class="ce-recent-order">
                                        <h3>Latest Activity</h3>
                                        ${orders.length > 0 ? `
                                            <div class="ce-order-snap">
                                                <div class="ce-snap-icon">📦</div>
                                                <div class="ce-snap-info">
                                                    <div class="ce-snap-primary">Order #${orders[0].id.substring(0,8).toUpperCase()}</div>
                                                    <div class="ce-snap-secondary">${new Date(orders[0].createdAt).toLocaleDateString()} • ${CURRENCY_SYMBOL}${parseFloat(orders[0].totalAmount).toFixed(2)}</div>
                                                </div>
                                                <div class="ce-order-status-tag status-${(orders[0].status || 'pending').toLowerCase()}">${orders[0].status || 'Processing'}</div>
                                            </div>
                                        ` : '<p style="color:#999">No recent orders to show.</p>'}
                                    </div>
                                </div>

                                <div class="ce-quick-actions">
                                    <h3>Quick Actions</h3>
                                    <div class="ce-action-grid">
                                        <button class="ce-action-btn" data-hub-tab="orders">📦 Track Orders</button>
                                        <button class="ce-action-btn" data-hub-tab="addresses">📍 Manage Address</button>
                                        <button class="ce-action-btn" data-hub-tab="profile">👤 Edit Profile</button>
                                        <a href="shop.html" class="ce-action-btn ce-action-primary">🛍️ Continue Shopping</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Orders Panel -->
                        ${!hide.includes('orders') ? `
                        <div class="ce-panel ${hide.includes('overview') ? 'active' : ''}" data-hub-panel="orders">
                            <h2 class="ce-panel-title">Order History</h2>
                            <div class="ce-orders-list">
                                ${orders.length === 0 ? `
                                    <div class="ce-empty-state">
                                        <span>🛍️</span>
                                        <p>You haven't placed any orders yet.</p>
                                    </div>
                                ` : orders.map(o => `
                                    <div class="ce-order-item">
                                        <div class="ce-order-top">
                                            <div class="ce-order-meta">
                                                <span class="ce-order-num">Order #${o.id.substring(0,8).toUpperCase()}</span>
                                                <span class="ce-order-date">${new Date(o.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div class="ce-status-pill status-${(o.status || 'pending').toLowerCase()}">${o.status || 'Pending'}</div>
                                        </div>
                                        
                                        <div class="ce-order-body">
                                            <div class="ce-order-products">
                                                ${(o.items || []).slice(0, 3).map(item => `
                                                    <div class="ce-order-thumb" title="${item.productTitle}">
                                                        <img src="${resolveImageUrl(item.product?.featuredImage)}" alt="product" />
                                                    </div>
                                                `).join('')}
                                                ${(o.items || []).length > 3 ? `<div class="ce-thumb-more">+${o.items.length - 3}</div>` : ''}
                                                <span class="ce-item-count">${o.items?.length || 0} Items</span>
                                            </div>
                                            <div class="ce-order-total-block">
                                                <span class="ce-total-lbl">Total Amount</span>
                                                <span class="ce-order-amt">${CURRENCY_SYMBOL}${parseFloat(o.totalAmount).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div class="ce-order-actions">
                                            <button class="ce-btn-secondary" onclick="AuraEngine.showOrderDetail('${o.id}')">🔍 View Details</button>
                                            <button class="ce-btn-outline" onclick="alert('Reordering items from ${o.id}')">🔄 Buy Again</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Addresses Panel -->
                        ${!hide.includes('addresses') ? `
                        <div class="ce-panel" data-hub-panel="addresses">
                            <div class="ce-panel-header">
                                <h2 class="ce-panel-title">Saved Addresses</h2>
                                <p class="ce-panel-subtitle">Manage your delivery locations and default shipping address.</p>
                            </div>

                            <div class="ce-address-grid">
                                <!-- Add New Button -->
                                <div class="ce-add-address-card" onclick="AuraEngine.showAddressForm()">
                                    <div class="ce-add-icon">+</div>
                                    <span>Add New Address</span>
                                </div>

                                ${addresses.length === 0 ? '' : addresses.map(a => `
                                    <div class="ce-address-card ${a.isDefault ? 'is-default' : ''}">
                                        <div class="ce-addr-top">
                                            <div class="ce-addr-badge">${(a.type || 'Shipping').toUpperCase()}</div>
                                            ${a.isDefault ? '<div class="ce-default-badge">DEFAULT</div>' : ''}
                                        </div>
                                        <div class="ce-addr-info">
                                            <h4 class="ce-addr-name">${a.firstName || ''} ${a.lastName || ''}</h4>
                                            <p class="ce-addr-street">${a.address1}${a.address2 ? ', ' + a.address2 : ''}</p>
                                            <p class="ce-addr-city">${a.city}, ${a.state || ''} ${a.postcode}</p>
                                            <p class="ce-addr-country">${a.country}</p>
                                            ${a.phone ? `<p class="ce-addr-phone">📞 ${a.phone}</p>` : ''}
                                        </div>
                                        <div class="ce-addr-actions">
                                            <button class="ce-addr-edit" onclick="AuraEngine.showAddressForm('${a.id}')">Edit</button>
                                            <button class="ce-addr-delete" onclick="AuraEngine.deleteAddress('${a.id}')">Delete</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Address Form Modal (Hidden by default) -->
                            <div id="ce-address-modal" class="ce-modal">
                                <div class="ce-modal-overlay" onclick="AuraEngine.hideAddressForm()"></div>
                                <div class="ce-modal-content">
                                    <div class="ce-modal-header">
                                        <h3 id="ce-address-form-title">Add New Address</h3>
                                        <button class="ce-modal-close" onclick="AuraEngine.hideAddressForm()">&times;</button>
                                    </div>
                                    <form id="ce-address-form" class="ce-profile-form">
                                        <input type="hidden" name="id" id="ce-addr-id" />
                                        <div class="ce-form-row">
                                            <div class="ce-input-group">
                                                <label>First Name</label>
                                                <input type="text" name="firstName" id="ce-addr-fn" required />
                                            </div>
                                            <div class="ce-input-group">
                                                <label>Last Name</label>
                                                <input type="text" name="lastName" id="ce-addr-ln" required />
                                            </div>
                                        </div>
                                        <div class="ce-input-group">
                                            <label>Address Line 1</label>
                                            <input type="text" name="address1" id="ce-addr-a1" placeholder="Street address" required />
                                        </div>
                                        <div class="ce-form-row">
                                            <div class="ce-input-group">
                                                <label>City</label>
                                                <input type="text" name="city" id="ce-addr-city" required />
                                            </div>
                                            <div class="ce-input-group">
                                                <label>Postcode / ZIP</label>
                                                <input type="text" name="postcode" id="ce-addr-zip" required />
                                            </div>
                                        </div>
                                        <div class="ce-form-row">
                                            <div class="ce-input-group">
                                                <label>Country</label>
                                                <input type="text" name="country" id="ce-addr-country" value="United States" required />
                                            </div>
                                            <div class="ce-input-group">
                                                <label>Phone</label>
                                                <input type="tel" name="phone" id="ce-addr-phone" />
                                            </div>
                                        </div>
                                        <div class="ce-checkbox-group">
                                            <input type="checkbox" name="isDefault" id="ce-addr-default" />
                                            <label for="ce-addr-default">Set as default shipping address</label>
                                        </div>
                                        <button type="submit" class="ce-btn-primary ce-w-full">Save Address</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Profile Panel -->
                        ${!hide.includes('profile') ? `
                        <div class="ce-panel" data-hub-panel="profile">
                            <h2 class="ce-panel-title">Profile Settings</h2>
                            <p class="ce-panel-subtitle">Manage your personal information and security preferences.</p>
                            
                            <div class="ce-profile-grid">
                                <!-- Personal Info Card -->
                                <div class="ce-profile-card">
                                    <div class="ce-card-header">
                                        <span class="ce-card-icon">👤</span>
                                        <h3>Personal Information</h3>
                                    </div>
                                    <form class="ce-profile-form" id="ce-personal-form">
                                        <div class="ce-form-row">
                                            <div class="ce-input-group">
                                                <label>First Name</label>
                                                <input type="text" name="firstName" value="${customer.firstName || ''}" placeholder="Enter first name" required />
                                            </div>
                                            <div class="ce-input-group">
                                                <label>Last Name</label>
                                                <input type="text" name="lastName" value="${customer.lastName || ''}" placeholder="Enter last name" required />
                                            </div>
                                        </div>
                                        <div class="ce-input-group">
                                            <label>Email Address</label>
                                            <input type="email" value="${customer.email}" readonly style="background: #f8f8f8; color: #888; cursor: not-allowed;" />
                                            <small style="font-size: 11px; color: #999; margin-top: 4px; display: block;">Email cannot be changed for security reasons.</small>
                                        </div>
                                        <div class="ce-input-group">
                                            <label>Phone Number</label>
                                            <input type="tel" name="phone" value="${customer.phone || ''}" placeholder="+1 (555) 000-0000" />
                                        </div>
                                        <button type="submit" class="ce-btn-primary ce-w-full">Save Changes</button>
                                    </form>
                                </div>

                                <!-- Security Card -->
                                <div class="ce-profile-card">
                                    <div class="ce-card-header">
                                        <span class="ce-card-icon">🔒</span>
                                        <h3>Security & Password</h3>
                                    </div>
                                    <form class="ce-profile-form" id="ce-password-form">
                                        <div class="ce-input-group">
                                            <label>Current Password</label>
                                            <input type="password" name="currentPassword" placeholder="••••••••" required />
                                        </div>
                                        <div class="ce-input-group">
                                            <label>New Password</label>
                                            <input type="password" name="newPassword" placeholder="Minimum 8 characters" required minlength="8" />
                                        </div>
                                        <div class="ce-input-group">
                                            <label>Confirm New Password</label>
                                            <input type="password" name="confirmPassword" placeholder="••••••••" required />
                                        </div>
                                        <button type="submit" class="ce-btn-secondary ce-w-full">Update Password</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- Wishlist Panel -->
                        ${!hide.includes('wishlist') ? `
                        <div class="ce-panel" data-hub-panel="wishlist">
                            <h2 class="ce-panel-title">My Wishlist</h2>
                            <p class="ce-panel-subtitle">Items you've saved to your boutique collection.</p>
                            
                            <div class="ce-wishlist-grid">
                                ${wishlist.length === 0 ? `
                                    <div class="ce-empty-state" style="grid-column: 1/-1; padding: 80px 20px; text-align: center; background: #fafafa; border-radius: 24px; border: 2px dashed #eee;">
                                        <div style="font-size: 48px; margin-bottom: 20px;">❤️</div>
                                        <p style="font-weight: 700; color: #111; margin-bottom: 8px;">Your wishlist is currently empty.</p>
                                        <p style="color: #999; font-size: 13px; margin-bottom: 24px;">Discover something beautiful to save for later.</p>
                                        <a href="shop.html" class="ce-btn-primary" style="text-decoration:none; display:inline-block; padding: 12px 32px;">Go Shopping</a>
                                    </div>
                                ` : wishlist.map(item => `
                                    <div class="ce-wishlist-card">
                                        <div class="ce-wish-img" onclick="window.location.href='product.html?slug=${item.slug}'">
                                            <img src="${resolveImageUrl(item.imageUrl || item.featuredImage)}" alt="${item.title}" />
                                        </div>
                                        <div class="ce-wish-info">
                                            <h4 class="ce-wish-title">${item.title}</h4>
                                            <p class="ce-wish-price">${CURRENCY_SYMBOL}${parseFloat(item.price || item.basePrice).toFixed(2)}</p>
                                        </div>
                                        <div class="ce-wish-actions">
                                            <button class="ce-btn-secondary ce-w-full" onclick="window.location.href='product.html?slug=${item.slug}'">View Product</button>
                                            <button class="ce-wish-remove" onclick="AuraEngine.removeFromWishlist('${item.productId || item.id}')">Remove Item</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // Tab Switching Logic (and Quick Action buttons)
            container.querySelectorAll('.ce-tab-btn[data-hub-tab], .ce-action-btn[data-hub-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.getAttribute('data-hub-tab');
                    // Update Sidebar active state
                    container.querySelectorAll('.ce-tab-btn').forEach(b => {
                        b.classList.toggle('active', b.getAttribute('data-hub-tab') === targetTab);
                    });
                    // Update Panels
                    container.querySelectorAll('.ce-panel').forEach(p => {
                        p.classList.toggle('active', p.getAttribute('data-hub-panel') === targetTab);
                    });
                });
            });

            bindButtons(container);

            // Profile Handlers
            const personalForm = container.querySelector('#ce-personal-form');
            if (personalForm) {
                personalForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = personalForm.querySelector('button[type="submit"]');
                    const originalText = btn.innerText;
                    btn.innerText = 'Saving...';
                    btn.disabled = true;

                    const formData = new FormData(personalForm);
                    const body = Object.fromEntries(formData.entries());

                    try {
                        const res = await api('/customer/profile', { method: 'PUT', body });
                        showToast('Profile updated successfully!');
                        // Update local customer data
                        if (res.customer) {
                            const current = getCustomer();
                            saveCustomer({ ...current, ...res.customer });
                        }
                    } catch (err) {
                        showToast(err.message || 'Failed to update profile', 'error');
                    } finally {
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                });
            }

            const passwordForm = container.querySelector('#ce-password-form');
            if (passwordForm) {
                passwordForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(passwordForm);
                    const { currentPassword, newPassword, confirmPassword } = Object.fromEntries(formData.entries());

                    if (newPassword !== confirmPassword) {
                        return showToast('Passwords do not match', 'error');
                    }

                    const btn = passwordForm.querySelector('button[type="submit"]');
                    const originalText = btn.innerText;
                    btn.innerText = 'Updating...';
                    btn.disabled = true;

                    try {
                        await api('/customer/profile/password', { 
                            method: 'PUT', 
                            body: { currentPassword, newPassword } 
                        });
                        showToast('Password changed successfully!');
                        passwordForm.reset();
                    } catch (err) {
                        showToast(err.message || 'Failed to change password', 'error');
                    } finally {
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                });

        window.AuraEngine.removeFromWishlist = async (id) => {
            if (confirm('Remove this item from your wishlist?')) {
                await toggleWishlist(id);
                AuraEngine.refresh();
            }
        };
            }
            const addressForm = container.querySelector('#ce-address-form');
            if (addressForm) {
                addressForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = addressForm.querySelector('button[type="submit"]');
                    const originalText = btn.innerText;
                    btn.innerText = 'Saving...';
                    btn.disabled = true;

                    const formData = new FormData(addressForm);
                    const body = Object.fromEntries(formData.entries());
                    body.isDefault = addressForm.querySelector('#ce-addr-default').checked;

                    try {
                        const id = document.getElementById('ce-addr-id').value;
                        if (id) {
                            await api(`/customer/addresses/${id}`, { method: 'PUT', body });
                        } else {
                            await api('/customer/addresses', { method: 'POST', body });
                        }
                        showToast(id ? 'Address updated!' : 'Address added!');
                        AuraEngine.hideAddressForm();
                        AuraEngine.refresh();
                    } catch (err) {
                        showToast(err.message || 'Failed to save address', 'error');
                    } finally {
                        btn.innerText = originalText;
                        btn.disabled = false;
                    }
                });
            }
        });

    }

    function getAccountHubStyles() {
        return `
            .ce-account-hub, .ce-account-hub *, .ce-modal, .ce-modal * { box-sizing: border-box; }
            .ce-account-hub {
                display: flex; gap: 40px; font-family: 'Inter', sans-serif; min-height: 600px;
                background: #fff; border-radius: 32px; padding: 40px; box-shadow: 0 40px 100px rgba(0,0,0,0.03);
            }
            .ce-layout-horizontal { flex-direction: column; }
            
            /* Sidebar */
            .ce-hub-sidebar { width: 300px; flex-shrink: 0; }
            .ce-layout-horizontal .ce-hub-sidebar { width: 100%; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            
            .ce-user-profile { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; }
            .ce-avatar { width: 64px; height: 64px; border-radius: 20px; background: var(--aura-theme, #F27D26); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; }
            .ce-name { margin: 0; font-size: 18px; font-weight: 800; color: #111; }
            .ce-email { margin: 0; font-size: 13px; color: #999; }
            
            .ce-hub-nav { display: flex; flex-direction: column; gap: 8px; }
            .ce-layout-horizontal .ce-hub-nav { flex-direction: row; flex-wrap: wrap; }
            
            .ce-tab-btn {
                background: none; border: none; text-align: left; padding: 14px 20px; border-radius: 12px;
                font-size: 14px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.3s;
                display: flex; align-items: center; gap: 12px;
            }
            .ce-tab-btn:hover { background: #f8f8f8; color: #111; }
            .ce-tab-btn.active { background: #fff; color: var(--aura-theme, #F27D26); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            
            .ce-nav-divider { height: 1px; background: #eee; margin: 10px 0; }
            .ce-logout-btn { background: none; border: none; text-align: left; padding: 14px 20px; font-size: 14px; font-weight: 600; color: #ff4d4d; cursor: pointer; }
            
            /* Content */
            .ce-hub-content { flex: 1; min-width: 0; }
            .ce-panel { display: none; animation: ceFadeUp 0.5s ease; }
            .ce-panel.active { display: block; }
            
            .ce-panel-title { font-size: 40px; font-weight: 900; margin-bottom: 8px; color: #111; letter-spacing: -0.04em; }
            .ce-panel-subtitle { color: #888; margin-bottom: 40px; font-size: 16px; }
            
            /* Stats */
            .ce-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .ce-stat-card { background: #fcfcfc; padding: 20px; border-radius: 20px; border: 1px solid #f0f0f0; text-align: center; }
            .ce-stat-val { display: block; font-size: 24px; font-weight: 900; color: #111; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; }
            .ce-stat-lbl { font-size: 11px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
            
            /* Overview Split */
            .ce-overview-split { display: flex; gap: 32px; margin-top: 32px; }
            .ce-quick-view { flex: 1.2; }
            .ce-quick-actions { flex: 0.8; }
            .ce-recent-order h3, .ce-quick-actions h3 { font-size: 18px; font-weight: 800; margin-bottom: 20px; color: #111; }
            
            .ce-order-snap { 
                display: flex; align-items: center; gap: 16px; background: #fff; padding: 20px; 
                border-radius: 20px; border: 1px solid #eee; transition: all 0.3s;
                box-shadow: 0 4px 20px rgba(0,0,0,0.02);
            }
            .ce-snap-icon { 
                width: 48px; height: 48px; background: #f8f8f8; border-radius: 14px; 
                display: flex; align-items: center; justify-content: center; font-size: 20px;
            }
            .ce-snap-info { flex: 1; }
            .ce-snap-primary { font-weight: 800; font-size: 15px; color: #111; }
            .ce-snap-secondary { font-size: 12px; color: #999; margin-top: 2px; }
            
            .ce-action-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
            .ce-action-btn { 
                padding: 14px 16px; border-radius: 14px; border: 1px solid #eee; background: #fff; 
                color: #111; font-size: 13px; font-weight: 700; cursor: pointer; text-align: left; 
                transition: all 0.2s; text-decoration: none; display: flex; align-items: center; gap: 10px;
                font-family: inherit;
            }
            .ce-action-btn:hover { border-color: var(--aura-theme, #F27D26); background: #fffcf9; transform: translateX(4px); }
            .ce-action-primary { background: var(--aura-theme, #F27D26); color: #fff; border: none; justify-content: center; box-shadow: 0 10px 20px rgba(242, 125, 38, 0.2); }
            .ce-action-primary:hover { background: #000; color: #fff; transform: translateY(-2px); }
            
            /* Orders Detailed */
            .ce-orders-list { display: flex; flex-direction: column; gap: 20px; }
            .ce-order-item { 
                background: #fff; padding: 24px; border-radius: 24px; border: 1px solid #f0f0f0; 
                transition: all 0.3s; display: flex; flex-direction: column; gap: 24px;
            }
            .ce-order-item:hover { transform: translateY(-4px); box-shadow: 0 30px 60px rgba(0,0,0,0.04); border-color: #eee; }
            
            .ce-order-top { display: flex; justify-content: space-between; align-items: center; }
            .ce-order-meta { display: flex; flex-direction: column; gap: 2px; }
            .ce-order-num { font-weight: 800; color: #111; font-size: 16px; letter-spacing: -0.02em; }
            .ce-order-date { font-size: 12px; color: #999; font-weight: 500; }
            
            .ce-order-body { display: flex; justify-content: space-between; align-items: center; background: #fafafa; padding: 16px 20px; border-radius: 16px; }
            .ce-order-products { display: flex; align-items: center; }
            .ce-order-thumb { 
                width: 44px; height: 44px; border-radius: 50%; border: 2px solid #fff; 
                overflow: hidden; background: #fff; margin-right: -14px; 
                transition: all 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            }
            .ce-order-thumb:hover { transform: scale(1.1) translateY(-4px); z-index: 10; }
            .ce-order-thumb img { width: 100%; height: 100%; object-fit: cover; }
            
            .ce-thumb-more { 
                width: 32px; height: 32px; border-radius: 50%; background: #eee; border: 2px solid #fff;
                display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; 
                color: #666; position: relative; z-index: 5; margin-left: 10px;
            }
            .ce-item-count { font-size: 13px; color: #999; font-weight: 700; margin-left: 12px; }
            
            .ce-order-total-block { text-align: right; }
            .ce-total-lbl { display: block; font-size: 10px; color: #bbb; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 2px; }
            .ce-order-amt { font-size: 22px; font-weight: 900; color: #111; letter-spacing: -0.02em; }
            
            .ce-order-actions { display: flex; gap: 12px; }
            .ce-btn-secondary { 
                background: #111; color: #fff; border: none; padding: 10px 20px; border-radius: 12px; 
                font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
            }
            .ce-btn-secondary:hover { background: #333; transform: translateY(-2px); }
            .ce-btn-outline { 
                background: transparent; border: 1.5px solid #eee; padding: 10px 20px; border-radius: 12px; 
                font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; color: #555;
            }
            .ce-btn-outline:hover { border-color: #111; color: #111; background: #fff; }

            .ce-status-pill { padding: 6px 14px; border-radius: 999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
            .status-completed { background: #d1fae5; color: #065f46; }
            .status-processing { background: #ecf3ff; color: #1e40af; }
            .status-pending { background: #fff7ed; color: #9a3412; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }

            /* Order Detail View */
            .ce-detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
            .ce-back-btn { 
                background: #f5f5f5; border: none; padding: 6px 12px; border-radius: 8px; 
                font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
            }
            .ce-back-btn:hover { background: #eee; transform: translateX(-4px); }
            
            .ce-order-detail-view { display: flex; flex-direction: column; gap: 30px; animation: ceFadeIn 0.3s ease-out; }
            @keyframes ceFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .ce-detail-top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0; }
            .ce-detail-main h3 { margin: 0 0 4px 0; font-size: 20px; font-weight: 900; color: #111; }
            .ce-detail-main p { margin: 0; font-size: 13px; color: #999; font-weight: 500; }
            
            .ce-detail-items { display: flex; flex-direction: column; gap: 16px; }
            .ce-detail-item { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px dashed #eee; }
            .ce-detail-item:last-child { border-bottom: none; }
            .ce-detail-item img { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; background: #f8f8f8; }
            .ce-item-info { flex: 1; }
            .ce-item-name { font-weight: 700; color: #111; font-size: 14px; margin-bottom: 4px; }
            .ce-item-meta { font-size: 12px; color: #999; font-weight: 500; }
            .ce-item-total { font-weight: 800; color: #111; font-size: 15px; }
            
            .ce-detail-summary { background: #fafafa; padding: 24px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px; }
            .ce-summary-row { display: flex; justify-content: space-between; font-size: 14px; color: #666; font-weight: 500; }
            .ce-summary-row.ce-discount { color: #059669; }
            .ce-summary-row.ce-total-row { margin-top: 8px; padding-top: 12px; border-top: 1px solid #eee; font-size: 18px; font-weight: 900; color: #111; }
            
            .ce-detail-footer { display: flex; gap: 12px; }
            
            /* Profile & Forms */
            .ce-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
            .ce-profile-card { 
                background: #fff; border: 1px solid #f0f0f0; border-radius: 24px; padding: 32px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.02);
            }
            .ce-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid #fafafa; padding-bottom: 16px; }
            .ce-card-icon { font-size: 20px; }
            .ce-card-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: #111; }
            
            .ce-profile-form { display: flex; flex-direction: column; gap: 20px; }
            .ce-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            
            .ce-input-group { display: flex; flex-direction: column; gap: 8px; }
            .ce-input-group label { font-size: 12px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
            .ce-input-group input { 
                width: 100%;
                padding: 12px 16px; border: 1.5px solid #eee; border-radius: 12px; font-size: 14px; 
                font-weight: 500; font-family: inherit; transition: all 0.2s; outline: none;
            }
            .ce-input-group input:focus { border-color: var(--aura-theme, #F27D26); box-shadow: 0 0 0 4px var(--aura-glow, rgba(242, 125, 38, 0.1)); }
            
            .ce-btn-primary { background: var(--aura-theme, #F27D26); color: #fff; border: none; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
            .ce-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px var(--aura-glow, rgba(242, 125, 38, 0.2)); }
            .ce-btn-secondary { background: #111; color: #fff; border: none; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
            .ce-btn-secondary:hover { background: #333; transform: translateY(-2px); }
            .ce-w-full { width: 100%; }

            /* Address Management */
            .ce-address-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; margin-top: 24px; }
            .ce-address-card { 
                background: #fff; border: 1px solid #f0f0f0; border-radius: 20px; padding: 24px; 
                display: flex; flex-direction: column; gap: 16px; position: relative; transition: all 0.3s;
                box-shadow: 0 4px 20px rgba(0,0,0,0.02);
            }
            .ce-address-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.06); border-color: #eee; }
            .ce-address-card.is-default { border-color: var(--aura-theme, #F27D26); background: #fffcf9; }
            
            .ce-add-address-card { 
                border: 2px dashed #eee; border-radius: 20px; display: flex; flex-direction: column; 
                align-items: center; justify-content: center; gap: 12px; cursor: pointer; color: #999; 
                transition: all 0.2s; min-height: 200px; 
            }
            .ce-add-address-card:hover { border-color: var(--aura-theme, #F27D26); color: var(--aura-theme, #F27D26); background: #fffcf9; }
            .ce-add-icon { font-size: 32px; font-weight: 300; }
            
            .ce-addr-top { display: flex; justify-content: space-between; align-items: center; }
            .ce-addr-badge { font-size: 10px; font-weight: 800; color: #999; letter-spacing: 0.05em; background: #f8f8f8; padding: 4px 8px; border-radius: 4px; }
            .ce-default-badge { font-size: 10px; font-weight: 900; color: #F27D26; letter-spacing: 0.05em; }
            
            .ce-addr-info h4 { margin: 0 0 8px 0; font-size: 15px; font-weight: 800; color: #111; }
            .ce-addr-info p { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }
            .ce-addr-phone { margin-top: 8px !important; color: #111 !important; font-weight: 600; }
            
            .ce-addr-actions { display: flex; gap: 12px; margin-top: auto; padding-top: 16px; border-top: 1px solid #fcfcfc; }
            .ce-addr-edit, .ce-addr-delete { background: none; border: none; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }
            .ce-addr-edit { color: var(--aura-theme, #F27D26); }
            .ce-addr-delete { color: #ff4d4d; }
            
            /* Modal */
            .ce-modal { 
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; 
                display: none; align-items: center; justify-content: center; padding: 20px;
            }
            .ce-modal-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
            .ce-modal-content { 
                position: relative; background: #fff; width: 100%; max-width: 500px; border-radius: 32px; 
                padding: 40px; box-shadow: 0 30px 100px rgba(0,0,0,0.2); animation: ceScaleUp 0.3s ease;
            }
            @keyframes ceScaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            
            .ce-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
            .ce-modal-header h3 { margin: 0; font-size: 20px; font-weight: 900; color: #111; letter-spacing: -0.02em; }
            .ce-modal-close { background: none; border: none; font-size: 28px; line-height: 1; color: #999; cursor: pointer; transition: color 0.2s; }
            .ce-modal-close:hover { color: #111; }
            
            .ce-checkbox-group { display: flex; align-items: center; gap: 12px; margin: 10px 0; }
            .ce-checkbox-group input { width: 18px; height: 18px; cursor: pointer; accent-color: var(--aura-theme, #F27D26); }
            .ce-checkbox-group label { font-size: 13px; font-weight: 600; color: #666; cursor: pointer; }

            /* Wishlist */
            .ce-wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
            .ce-wishlist-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 20px; overflow: hidden; transition: all 0.3s; display: flex; flex-direction: column; }
            .ce-wishlist-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.04); }
            .ce-wish-img { height: 200px; background: #fafafa; display: flex; align-items: center; justify-content: center; cursor: pointer; margin: 4px; border-radius: 16px; overflow: hidden; }
            .ce-wish-img img { max-width: 90%; max-height: 90%; object-fit: contain; mix-blend-mode: multiply; transition: transform 0.3s; }
            .ce-wishlist-card:hover .ce-wish-img img { transform: scale(1.05); }
            .ce-wish-info { padding: 16px; flex: 1; }
            .ce-wish-title { margin: 0 0 4px 0; font-size: 15px; font-weight: 800; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .ce-wish-price { margin: 0; font-size: 14px; font-weight: 600; color: var(--aura-theme, #F27D26); }
            .ce-wish-actions { padding: 16px; border-top: 1px solid #fcfcfc; display: flex; flex-direction: column; gap: 8px; }
            .ce-wish-remove { background: none; border: none; font-size: 12px; font-weight: 700; color: #ff4d4d; cursor: pointer; padding: 4px; transition: opacity 0.2s; }
            .ce-wish-remove:hover { opacity: 0.7; }

            @keyframes ceFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ce-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            
            @media (max-width: 900px) {
                .ce-profile-grid { grid-template-columns: 1fr; }
            }
            
            @media (max-width: 768px) {
                .ce-account-hub { flex-direction: column; padding: 20px; border-radius: 0; }
                .ce-hub-sidebar { width: 100%; margin-bottom: 20px; }
                .ce-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                .ce-overview-split { flex-direction: column; gap: 32px; }
            }
        `;
    }
    function getRatingStyles() {
        return `
            .wfc-rating-inline { display: flex; align-items: center; gap: 8px; font-family: 'Inter', sans-serif; }
            .wfc-stars { color: #facc15; font-size: 18px; line-height: 1; display: flex; gap: 2px; }
            .wfc-star-empty { color: #e2e8f0; }
            .wfc-review-count { color: #64748b; font-size: 13px; font-weight: 500; }
            .wfc-no-rating { color: #94a3b8; font-size: 13px; font-style: italic; }

            /* Review List */
            .wfc-reviews-list { display: flex; flex-direction: column; gap: 16px; margin: 24px 0; }
            .wfc-review-card { background: #fff; border: 1px solid #f1f5f9; border-radius: 16px; padding: 20px; transition: all 0.3s; }
            .wfc-review-card:hover { border-color: #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
            .wfc-review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .wfc-review-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
            .wfc-review-title { margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1e293b; }
            .wfc-review-text { margin: 0; font-size: 14px; line-height: 1.6; color: #475569; }

            /* Review Form */
            .wfc-review-form { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; margin-top: 40px; }
            .wfc-review-form h3 { margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #1e293b; }
            .wfc-star-input-wrap { margin-bottom: 24px; }
            .wfc-star-input-wrap label { display: block; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
            .wfc-star-input { display: flex; gap: 8px; cursor: pointer; }
            .wfc-star-item { font-size: 32px; color: #cbd5e1; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .wfc-star-item.hover, .wfc-star-item.selected { color: #facc15; transform: scale(1.1); }
            
            .wfc-review-form .wfc-input, .wfc-review-form .wfc-textarea { 
                width: 100%; padding: 14px 18px; border: 1.5px solid #e2e8f0; border-radius: 14px; 
                font-family: inherit; font-size: 14px; background: #fff; outline: none; transition: border-color 0.2s;
            }
            .wfc-review-form .wfc-textarea { min-height: 120px; resize: vertical; }
            .wfc-review-form .wfc-input:focus, .wfc-review-form .wfc-textarea:focus { border-color: #facc15; }
            
            .wfc-btn-submit { 
                background: #1e293b; color: #fff; border: none; padding: 14px 28px; border-radius: 14px; 
                font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 10px;
            }
            .wfc-btn-submit:hover:not(:disabled) { background: #0f172a; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(30, 41, 59, 0.2); }
            .wfc-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

            .wfc-review-success { text-align: center; padding: 40px; background: #f0fdf4; border-radius: 24px; border: 1px solid #dcfce7; }
            .wfc-success-icon { font-size: 48px; color: #22c55e; margin-bottom: 16px; }
            .wfc-review-success h3 { margin: 0 0 8px 0; color: #166534; }
            .wfc-review-success p { color: #15803d; margin-bottom: 24px; }
            
            .wfc-review-auth-prompt { text-align: center; padding: 32px; background: #fff; border: 2px dashed #e2e8f0; border-radius: 20px; }
            .wfc-review-auth-prompt p { margin-bottom: 20px; color: #64748b; font-weight: 500; }
        `;
    }

    async function renderCartPage() {
        const containers = document.querySelectorAll('[data-commerce="cart-page"]');
        if (containers.length === 0) return;

        const cart = getCart();
        const symbol = window.CommerceConfig?.currencySymbol || CURRENCY_SYMBOL || '$';
        
        // Calculate totals for initial render (matches renderCartUI logic)
        const subtotal = cart.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
        const coupon = getAppliedCoupon();
        const discount = (coupon && coupon.valid) ? (coupon.discountAmount || 0) : 0;
        const total = Math.max(0, subtotal - discount);

        containers.forEach(container => {
            if (cart.items.length === 0) {
                container.innerHTML = `
                    <div class="ce-cart-page-empty">
                        <div class="ce-empty-icon">🛍️</div>
                        <h2 class="ce-empty-title">Your Bag is Empty</h2>
                        <p class="ce-empty-text">Discover something beautiful to fill it with.</p>
                        <a href="shop.html" class="ce-continue-btn">Continue Shopping</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="ce-cart-page-grid">
                    <div class="ce-cart-main">
                        <div class="ce-cart-card">
                            <div class="ce-card-header">
                                <h2 class="ce-card-title">Selected Items</h2>
                                <span class="ce-item-count-badge">${cart.items.length} Items</span>
                            </div>
                            <div class="ce-cart-items-list" data-commerce="cart-items">
                                <!-- Items will be synced by renderCartUI -->
                            </div>
                            <div class="ce-cart-footer">
                                <a href="shop.html" class="ce-back-to-shop">← Continue Shopping</a>
                            </div>
                        </div>
                    </div>
                    <aside class="ce-cart-sidebar">
                        <div class="ce-cart-card">
                            <div class="ce-card-header">
                                <h2 class="ce-card-title">Order Summary</h2>
                            </div>
                            <div class="ce-summary-details">
                                <div class="ce-summary-row">
                                    <span>Items Subtotal</span>
                                    <span data-commerce="cart-subtotal">${symbol}${subtotal.toFixed(2)}</span>
                                </div>
                                <div class="ce-summary-row ce-discount-row">
                                    <span>Boutique Savings</span>
                                    <span data-commerce="cart-discount">-${symbol}${discount.toFixed(2)}</span>
                                </div>
                                <div class="ce-summary-row">
                                    <span>Global Shipping</span>
                                    <span class="ce-shipping-free">COMPLIMENTARY</span>
                                </div>
                                <div class="ce-summary-row ce-total-row">
                                    <span>Total</span>
                                    <span data-commerce="cart-total">${symbol}${total.toFixed(2)}</span>
                                </div>

                                <div class="ce-coupon-section">
                                    <span class="ce-coupon-label">Promo Code</span>
                                    <div class="ce-coupon-input-group">
                                        <input type="text" class="ce-coupon-input" placeholder="Enter code..." data-commerce="coupon-input">
                                        <button class="ce-coupon-btn" data-commerce="coupon-apply">Apply</button>
                                    </div>
                                </div>

                                <button class="ce-checkout-btn" data-commerce="checkout-btn">
                                    Checkout Now
                                </button>

                                <div class="ce-secure-badge">
                                    SECURE STRIPE PAYMENTS • GLOBAL DELIVERY
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            `;
        });

        // Trigger the standard cart UI update to fill the newly created list
        renderCartUI();
        bindButtons();
    }

    function getCartPageStyles() {
        return `
            .ce-cart-page-grid {
                display: grid;
                grid-template-columns: 1fr 440px;
                gap: 40px;
                align-items: start;
                font-family: 'Inter', sans-serif;
                margin-top: 40px;
                animation: ceFadeUp 0.6s ease;
            }
            .ce-cart-main { min-width: 0; }
            .ce-cart-card {
                background: #fff;
                border: 1px solid rgba(0,0,0,0.06);
                border-radius: 20px;
                box-shadow: 0 40px 100px rgba(0,0,0,0.02);
                overflow: hidden;
            }
            .ce-card-header {
                padding: 30px 40px;
                border-bottom: 1px solid rgba(0,0,0,0.06);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ce-card-title {
                font-family: 'Playfair Display', serif;
                font-size: 24px;
                font-weight: 800;
                margin: 0;
                color: #111;
            }
            .ce-item-count-badge {
                font-size: 13px;
                font-weight: 700;
                color: #999;
            }
            .ce-cart-items-list { padding: 0; }
            .ce-cart-footer {
                padding: 30px 40px;
                background: #fafafa;
                border-top: 1px solid rgba(0,0,0,0.06);
            }
            .ce-back-to-shop {
                color: #111;
                text-decoration: none;
                font-weight: 800;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                transition: color 0.3s;
            }
            .ce-back-to-shop:hover { color: var(--aura-theme, #F27D26); }

            /* Summary Sidebar */
            .ce-cart-sidebar { position: sticky; top: 100px; }
            .ce-summary-details { padding: 40px; }
            .ce-summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 15px;
                color: #666;
                font-weight: 500;
            }
            .ce-discount-row { color: var(--aura-theme, #F27D26); }
            .ce-shipping-free { color: #2fb15c; font-weight: 800; }
            .ce-total-row {
                margin-top: 30px;
                padding-top: 30px;
                border-top: 2px solid #f9f9f9;
                color: #111;
                font-weight: 900;
                font-size: 26px;
                letter-spacing: -0.02em;
            }

            /* Coupon Section */
            .ce-coupon-section {
                margin-top: 35px;
                padding: 24px;
                background: #fcfcfc;
                border-radius: 16px;
                border: 1.5px dashed #eee;
            }
            .ce-coupon-label {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: #999;
                margin-bottom: 12px;
                display: block;
            }
            .ce-coupon-input-group { display: flex; gap: 10px; }
            .ce-coupon-input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid #eee;
                border-radius: 10px;
                font-family: inherit;
                font-size: 13px;
                outline: none;
                transition: border-color 0.3s;
            }
            .ce-coupon-input:focus { border-color: var(--aura-theme, #F27D26); }
            .ce-coupon-btn {
                background: #111;
                color: #fff;
                border: none;
                padding: 0 20px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 800;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.3s;
            }
            .ce-coupon-btn:hover { background: var(--aura-theme, #F27D26); }

            .ce-checkout-btn {
                width: 100%;
                background: #111;
                color: #fff;
                border: none;
                padding: 22px;
                font-size: 14px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                border-radius: 14px;
                margin-top: 40px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .ce-checkout-btn:hover {
                background: var(--aura-theme, #F27D26);
                transform: translateY(-4px);
                box-shadow: 0 20px 40px var(--aura-glow, rgba(242, 125, 38, 0.2));
            }
            .ce-secure-badge {
                margin-top: 24px;
                text-align: center;
                opacity: 0.4;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.1em;
            }

            /* Empty State */
            .ce-cart-page-empty {
                padding: 120px 40px;
                text-align: center;
                background: #fff;
                border-radius: 32px;
                border: 1px solid rgba(0,0,0,0.06);
                animation: ceFadeUp 0.8s ease;
            }
            .ce-empty-icon { font-size: 64px; margin-bottom: 24px; }
            .ce-empty-title {
                font-family: 'Playfair Display', serif;
                font-size: 32px;
                font-weight: 800;
                margin-bottom: 12px;
                color: #111;
            }
            .ce-empty-text { color: #888; margin-bottom: 32px; font-size: 16px; }
            .ce-continue-btn {
                display: inline-block;
                background: #111;
                color: #fff;
                text-decoration: none;
                padding: 16px 40px;
                border-radius: 40px;
                font-size: 14px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                transition: all 0.3s;
            }
            .ce-continue-btn:hover { background: var(--aura-theme, #F27D26); transform: translateY(-2px); }

            @media (max-width: 1100px) {
                .ce-cart-page-grid { grid-template-columns: 1fr; }
                .ce-cart-sidebar { position: static; }
            }
        `;
    }

    async function renderShopPage() {
        const containers = document.querySelectorAll('[data-commerce="shop-page"]');
        if (containers.length === 0) return;

        // Inject Styles if not already present
        if (!document.getElementById('ce-shop-styles')) {
            const style = document.createElement('style');
            style.id = 'ce-shop-styles';
            style.textContent = getShopPageStyles();
            document.head.appendChild(style);
        }

        containers.forEach(container => {
            if (container.__ceShopRendered) return;
            container.__ceShopRendered = true;

            const showTabs = container.getAttribute('data-show-tabs') === 'true';
            const showSidebar = container.getAttribute('data-show-sidebar') !== 'false';
            const limit = container.getAttribute('data-limit') || '12';
            const columns = container.getAttribute('data-columns') || '3';
            const title = container.getAttribute('data-title') || 'The Collection';
            const subtitle = container.getAttribute('data-subtitle') || 'Explore our full range of premium technical outerwear.';

            container.innerHTML = `
                <div class="ce-shop-wrapper">
                    <header class="ce-shop-header">
                        <div class="ce-shop-header-content">
                            <h1 class="ce-shop-title">${title}</h1>
                            <p class="ce-shop-subtitle">${subtitle}</p>
                        </div>
                    </header>

                    <div class="ce-shop-container">
                        ${showTabs ? `
                        <div class="ce-shop-tabs">
                            <div class="ce-tabs-track" data-commerce="product-filter" data-layout="horizontal" data-price="false" data-sort="false">
                                <!-- renderProductFilter will fill this -->
                            </div>
                        </div>
                        ` : ''}

                        <div class="ce-shop-layout">
                            ${showSidebar ? `
                            <aside class="ce-shop-sidebar">
                                <div class="ce-sidebar-section">
                                    <h3 class="ce-sidebar-title">Sort By</h3>
                                    <div class="ce-sort-options">
                                        <select class="ce-select" onchange="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.setAttribute('data-sort', this.value); window.__commerceEngine.refreshGrid(grid);">
                                            <option value="newest">New Arrivals</option>
                                            <option value="price-low">Price: Low to High</option>
                                            <option value="price-high">Price: High to Low</option>
                                            <option value="name">Name: A-Z</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="ce-sidebar-section">
                                    <h3 class="ce-sidebar-title">Price Range</h3>
                                    <div class="ce-price-inputs">
                                        <input type="number" placeholder="Min" class="ce-input" onchange="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.setAttribute('data-min-price', this.value || 0); window.__commerceEngine.refreshGrid(grid);">
                                        <span>—</span>
                                        <input type="number" placeholder="Max" class="ce-input" onchange="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.setAttribute('data-max-price', this.value || 99999); window.__commerceEngine.refreshGrid(grid);">
                                    </div>
                                </div>

                                <div class="ce-sidebar-section">
                                    <h3 class="ce-sidebar-title">Filters</h3>
                                    <label class="ce-checkbox-label">
                                        <input type="checkbox" onchange="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.setAttribute('data-on-sale', this.checked ? 'true' : 'false'); window.__commerceEngine.refreshGrid(grid);">
                                        <span>On Sale</span>
                                    </label>
                                    <label class="ce-checkbox-label">
                                        <input type="checkbox" onchange="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.setAttribute('data-in-stock', this.checked ? 'true' : 'false'); window.__commerceEngine.refreshGrid(grid);">
                                        <span>In Stock Only</span>
                                    </label>
                                </div>

                                <button class="ce-btn-reset" onclick="const grid = this.closest('.ce-shop-container').querySelector('[data-commerce=\\'product-list\\']'); grid.removeAttribute('data-min-price'); grid.removeAttribute('data-max-price'); grid.removeAttribute('data-sort'); grid.removeAttribute('data-on-sale'); grid.removeAttribute('data-in-stock'); this.closest('.ce-shop-sidebar').querySelectorAll('input').forEach(i => i.type === 'checkbox' ? i.checked = false : i.value = ''); window.__commerceEngine.refreshGrid(grid);">Reset Filters</button>
                            </aside>
                            ` : ''}

                            <main class="ce-shop-main">
                                <div class="ce-shop-grid" data-commerce="product-list" data-limit="${limit}" data-columns="${columns}">
                                    <template data-commerce="product-template">
                                        <div class="ce-product-card" data-commerce="product-item" data-product-id="{{id}}">
                                            <div class="ce-card-image-wrap">
                                                <a href="product.html?slug={{slug}}">
                                                    <img src="{{imageUrl}}" alt="{{title}}">
                                                </a>
                                                <button class="ce-quick-add" data-commerce="add-to-cart">
                                                    <span>Quick Add</span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                </button>
                                                <button class="ce-wishlist-heart" data-commerce="wishlist-toggle" data-product-id="{{id}}">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                                </button>
                                            </div>
                                            <div class="ce-card-info">
                                                <span class="ce-card-tag">Aura Premium</span>
                                                <h3 class="ce-card-title">{{title}}</h3>
                                                <div class="ce-card-price">${CURRENCY_SYMBOL}{{price}}</div>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </main>
                        </div>
                    </div>
                </div>
            `;

            // Trigger child component initialization
            if (showTabs) renderProductFilter();
            renderProductList();
        });
    }

    function getShopPageStyles() {
        return `
            .ce-shop-wrapper { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
            .ce-shop-header { padding: 120px 5% 60px; text-align: center; background: #fafafa; border-bottom: 1px solid #eee; margin-bottom: 40px; }
            .ce-shop-title { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 900; margin-bottom: 16px; letter-spacing: -0.02em; }
            .ce-shop-subtitle { color: #888; font-size: 18px; max-width: 600px; margin: 0 auto; }

            .ce-shop-container { max-width: 1400px; margin: 0 auto; padding: 0 5% 100px; }
            
            /* Tabs */
            .ce-shop-tabs { margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .ce-tabs-track .wfc-product-filter { justify-content: center; border: none; padding: 0; }
            .ce-tabs-track .wfc-filter-cat { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; font-size: 11px; color: #999; }
            .ce-tabs-track .wfc-filter-cat.active { color: var(--aura-theme, #F27D26); border-bottom: 2px solid var(--aura-theme, #F27D26); border-radius: 0; }

            .ce-shop-layout { display: flex; gap: 40px; align-items: flex-start; }
            
            /* Sidebar */
            .ce-shop-sidebar { width: 260px; flex-shrink: 0; position: sticky; top: 100px; }
            .ce-sidebar-section { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #f5f5f5; }
            .ce-sidebar-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111; margin-bottom: 20px; }
            
            .ce-select { width: 100%; padding: 12px; border: 1.5px solid #eee; border-radius: 12px; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; }
            .ce-select:focus { border-color: var(--aura-theme, #F27D26); }
            
            .ce-price-inputs { display: flex; align-items: center; gap: 10px; }
            .ce-input { width: 100%; padding: 10px; border: 1.5px solid #eee; border-radius: 10px; font-size: 13px; font-family: inherit; outline: none; }
            .ce-input:focus { border-color: var(--aura-theme, #F27D26); }
            
            .ce-checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #555; cursor: pointer; margin-bottom: 12px; }
            .ce-checkbox-label input { width: 18px; height: 18px; accent-color: var(--aura-theme, #F27D26); }
            
            .ce-btn-reset { width: 100%; padding: 12px; background: #f5f5f5; border: none; border-radius: 12px; font-size: 13px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.2s; }
            .ce-btn-reset:hover { background: #eee; color: #111; }

            /* Main Content */
            .ce-shop-main { flex: 1; }
            .ce-shop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
            
            .ce-product-card { background: #fff; border-radius: 20px; border: 1px solid #f0f0f0; overflow: hidden; transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); position: relative; }
            .ce-product-card:hover { transform: translateY(-8px); box-shadow: 0 30px 60px rgba(0,0,0,0.06); border-color: #eee; }
            
            .ce-card-image-wrap { position: relative; aspect-ratio: 4/5; overflow: hidden; background: #f8f8f8; }
            .ce-card-image-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
            .ce-product-card:hover .ce-card-image-wrap img { transform: scale(1.05); }
            
            .ce-quick-add { position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%) translateY(10px); opacity: 0; background: #fff; padding: 12px 24px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s; z-index: 10; }
            .ce-product-card:hover .ce-quick-add { opacity: 1; transform: translateX(-50%) translateY(0); }
            .ce-quick-add:hover { background: var(--aura-theme, #F27D26); color: #fff; }
            .ce-wishlist-heart { position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; color: #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.2s; z-index: 10; padding: 0; }
            .ce-wishlist-heart:hover { transform: scale(1.1); color: #ff4d4d; }
            .ce-wishlist-heart.wfc-wishlisted { color: #ff4d4d; }
            .ce-wishlist-heart svg { pointer-events: none; }

            .ce-card-info { padding: 20px; text-align: center; }
            .ce-card-tag { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--aura-theme, #F27D26); font-weight: 800; margin-bottom: 6px; }
            .ce-card-title { font-size: 16px; font-weight: 800; color: #111; margin: 0 0 4px 0; }
            .ce-card-price { font-size: 14px; color: #666; font-weight: 600; }

            @media (max-width: 1024px) {
                .ce-shop-layout { flex-direction: column; }
                .ce-shop-sidebar { width: 100%; position: static; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .ce-sidebar-section { margin-bottom: 0; border: none; }
                .ce-btn-reset { grid-column: span 2; }
            }
            @media (max-width: 640px) {
                .ce-shop-title { font-size: 40px; }
                .ce-shop-grid { grid-template-columns: 1fr; }
                .ce-shop-sidebar { grid-template-columns: 1fr; }
                .ce-btn-reset { grid-column: auto; }
            }
        `;
    }

    async function renderAccountPage() {
        const containers = document.querySelectorAll('[data-commerce="account-page"], [data-commerce="account-ui"]');
        if (containers.length === 0) return;

        const state = await loadAccountState();
        if (!state) {
            containers.forEach(c => c.innerHTML = '<div style="padding:40px; text-align:center;"><h3>Please Login</h3><p>You must be signed in to view your account.</p><button data-commerce="customer-login" class="wfc-auth-submit-btn" style="width:auto; padding:10px 30px;">Sign In</button></div>');
            bindButtons();
            return;
        }

        const { customer, orders, addresses, wishlistCount } = state;

        containers.forEach(container => {
            if (container.__wfcRendered) return;
            container.__wfcRendered = true;

            const skin = container.getAttribute('data-skin') || 'default';
            
            container.innerHTML = `
                <div class="wfc-account-dashboard wfc-skin-${skin}">
                    <div class="wfc-account-sidebar">
                        <div class="wfc-account-user-card">
                            <div class="wfc-account-avatar">${(customer.firstName || customer.email).charAt(0).toUpperCase()}</div>
                            <div class="wfc-account-user-info">
                                <h4 class="wfc-account-name">${customer.firstName || customer.email.split('@')[0]}</h4>
                                <p class="wfc-account-email">${customer.email}</p>
                            </div>
                        </div>
                        <nav class="wfc-account-nav">
                            <span class="wfc-account-tab active" data-tab="overview">📊 Overview</span>
                            <span class="wfc-account-tab" data-tab="orders">📦 Orders</span>
                            <span class="wfc-account-tab" data-tab="addresses">📍 Addresses</span>
                            <span class="wfc-account-tab" data-tab="profile">👤 Profile</span>
                            <hr style="margin: 10px 0; border: none; border-top: 1px solid #eee;" />
                            <span data-commerce="customer-logout" class="wfc-account-logout">👋 Sign Out</span>
                        </nav>
                    </div>
                    <div class="wfc-account-content">
                        <!-- Overview -->
                        <div class="wfc-account-panel active" data-panel="overview">
                            <h2 class="wfc-panel-title">Dashboard Overview</h2>
                            <div class="wfc-account-stats">
                                <div class="wfc-stat-card"><span class="wfc-stat-value">${orders.length}</span><span class="wfc-stat-label">Orders</span></div>
                                <div class="wfc-stat-card"><span class="wfc-stat-value">${addresses.length}</span><span class="wfc-stat-label">Addresses</span></div>
                                <div class="wfc-stat-card"><span class="wfc-stat-value">${wishlistCount}</span><span class="wfc-stat-label">Wishlist</span></div>
                            </div>
                            <h3 style="margin-top:40px;">Recent Activity</h3>
                            <p style="color:#666;">Welcome back to your premium account dashboard.</p>
                        </div>
                        
                        <!-- Orders -->
                        <div class="wfc-account-panel" data-panel="orders">
                            <h2 class="wfc-panel-title">Order History</h2>
                            <div class="wfc-orders-list-full">
                                ${orders.length === 0 ? '<p>No orders yet.</p>' : orders.map(o => `
                                    <div class="wfc-order-row">
                                        <div class="wfc-order-main">
                                            <span class="wfc-order-id">#${o.id.substring(0,8).toUpperCase()}</span>
                                            <span class="wfc-order-date">${new Date(o.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div class="wfc-order-meta">
                                            <span class="wfc-order-total">${CURRENCY_SYMBOL}${parseFloat(o.totalAmount).toFixed(2)}</span>
                                            <span class="wfc-order-status wfc-status-${(o.status || 'pending').toLowerCase()}">${o.status || 'Pending'}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Addresses -->
                        <div class="wfc-account-panel" data-panel="addresses">
                            <h2 class="wfc-panel-title">My Addresses</h2>
                            <div class="wfc-addresses-grid">
                                ${addresses.length === 0 ? '<p>Empty.</p>' : addresses.map(a => `
                                    <div class="wfc-address-card">
                                        <strong>${a.label || 'Address'}</strong>
                                        <p>${a.street || ''}<br>${a.city || ''} ${a.zip || ''}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Profile -->
                        <div class="wfc-account-panel" data-panel="profile">
                            <h2 class="wfc-panel-title">Profile Settings</h2>
                            <div class="wfc-form-group">
                                <label class="wfc-form-label">Full Name</label>
                                <input type="text" class="wfc-form-input" value="${customer.firstName || ''} ${customer.lastName || ''}" readonly />
                            </div>
                            <div class="wfc-form-group">
                                <label class="wfc-form-label">Email Address</label>
                                <input type="email" class="wfc-form-input" value="${customer.email}" readonly />
                            </div>
                        </div>
                    </div>
                </div>`;

            // Tab toggling
            container.querySelectorAll('.wfc-account-tab[data-tab]').forEach(tab => {
                tab.addEventListener('click', () => {
                    container.querySelectorAll('.wfc-account-tab').forEach(t => t.classList.remove('active'));
                    container.querySelectorAll('.wfc-account-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    container.querySelector(`[data-panel="${tab.getAttribute('data-tab')}"]`)?.classList.add('active');
                });
            });

            bindButtons(container);
        });
    }



    // --- Initialization ---
    async function init() {
        console.log('[CommerceEngine] SDK Init sequence started...');
        const config = window.CommerceConfig || {};
        const storeKey = config.storeKey || SCRIPT_TAG?.getAttribute('data-store-key');
        const apiBase = config.apiBase || SCRIPT_TAG?.getAttribute('data-api-url') || 'http://127.0.0.1:5001';

        if (storeKey) STORE_KEY = storeKey;
        if (apiBase) API_BASE = apiBase.replace(/\/$/, '');

        // Automatic Redirect for Account Pages (Improved)
        const isAccountPage = window.location.pathname.includes('account.html') || document.querySelector('[data-commerce="account-hub"]');
        if (isAccountPage && !isLoggedIn()) {
             console.log('[CommerceEngine] Unauthorized access to account page - triggering redirect logic');
             if (!window.location.pathname.includes('auth.html') && !window.location.pathname.includes('login')) {
                  window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.pathname);
                  return;
             }
        }

        // Inject Styles early to prevent FOUC
        if (!document.getElementById('ce-hub-styles')) {
            const style = document.createElement('style');
            style.id = 'ce-hub-styles';
            style.textContent = getAccountHubStyles() + getRatingStyles() + getCartPageStyles();
            document.head.appendChild(style);
        }

        try {
            createCartSidebar();
            bindButtons();
            updateCartBadges();
            renderCartUI();
            renderCheckoutUI();
            await renderProductList();

            const details = document.querySelectorAll('[data-commerce="product-detail"]');
            for (const el of details) {
                await renderProductDetail(el);
            }

            renderCategoryFilter();
            renderProductFilter();
            syncAuthUI();
            initSearch();
            updateWishlistIcons();
            syncWishlist();
            renderRecentlyViewed();

            // Phase 6-8: Complete UI components
            renderCheckoutPage();

            renderAuthForms();
            renderCheckoutBlocks();
            renderCartPage();
            renderAccountBlocks();
            await renderAccountHub();
            await renderShopPage();
            await renderProductPage();
            await renderWishlistPage();

            // Cross-tab synchronization
            window.addEventListener('storage', (e) => {
                if (e.key === CART_KEY) {
                    renderCartUI();
                    renderCheckoutUI();
                    updateCartBadges();
                }
                if (e.key === 'wfc_wishlist' || e.key === 'wfc_wishlist_map') {
                    updateWishlistIcons();
                }
            });
            console.log('[CommerceEngine] Initialization complete');
        } catch (err) {
            console.error('[CommerceEngine] Initialization failed:', err);
        }
    }

    // --- Recently Viewed ---
    function trackViewedProduct(productId) {
        if (!productId) return;
        let viewed = JSON.parse(safeStorage.getItem('wfc_viewed_products') || '[]');
        viewed = [productId, ...viewed.filter(id => id !== productId)].slice(0, 10);
        safeStorage.setItem('wfc_viewed_products', JSON.stringify(viewed));
        document.dispatchEvent(new CustomEvent('wfc:product-viewed', { detail: { productId } }));
    }

    async function renderRecentlyViewed() {
        const containers = document.querySelectorAll('[data-commerce="recent-products"]');
        if (containers.length === 0) return;

        const viewed = JSON.parse(safeStorage.getItem('wfc_viewed_products') || '[]');
        if (viewed.length === 0) {
            containers.forEach(c => c.style.display = 'none');
            return;
        }

        for (const container of containers) {
            const limit = parseInt(container.getAttribute('data-limit')) || 4;
            const ids = viewed.slice(0, limit);

            try {
                const data = await api(`/public/products?ids=${ids.join(',')}`);
                if (!data.products || data.products.length === 0) {
                    container.style.display = 'none';
                    continue;
                }

                const template = container.querySelector('[data-commerce="product-template"]');
                if (!template) continue;

                // Clear previous items except template
                Array.from(container.children).forEach(child => {
                    if (child !== template) child.remove();
                });

                // Sort by viewed order
                const sorted = ids.map(id => data.products.find(p => p.id === id)).filter(Boolean);

                sorted.forEach(product => {
                    let html = template.tagName === 'TEMPLATE' ? template.innerHTML : template.outerHTML;
                    const productHtml = replacePlaceholders(html, product);
                    const temp = document.createElement('div');
                    temp.innerHTML = productHtml;
                    const item = temp.firstElementChild;
                    if (template.tagName !== 'TEMPLATE') item.style.display = '';
                    item.setAttribute('data-commerce', 'product-item');
                    item.setAttribute('data-product-id', product.id);
                    fillProductFields(item, product);
                    bindButtons(item);
                    container.appendChild(item);
                });
            } catch (e) {
                console.error('[CommerceEngine] Recently viewed failed:', e);
            }
        }
    }

    // --- Auto-init ---

    // alert("[DEBUG] Reached bottom of engine.js - Calling init()");
    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Final Initialization Dispatch
    setTimeout(() => {
        const cart = getCart();
        document.dispatchEvent(new CustomEvent('ce-cart-updated', { detail: { cart } }));
        console.log("[CommerceEngine] Initial sync event dispatched");
    }, 500);
})();
