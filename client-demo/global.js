/**
 * AURA Global Components System
 * Synchronizes header, footer, and branding across all pages.
 */

const GLOBAL_HEADER_HTML = `
    <nav class="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-8 md:px-12 transition-all duration-500 text-white" id="main-nav">
        <div class="flex items-center gap-2">
            <a href="index.html" class="flex items-center gap-2 logo-container">
                <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-black/5 logo-circle">
                    <div class="w-6 h-2 bg-black rounded-full transform -rotate-45 logo-line"></div>
                </div>
                <span class="text-2xl font-bold tracking-tighter uppercase italic logo-text">Aura</span>
            </a>
        </div>

        <div class="hidden md:flex items-center gap-8 glass px-8 py-3 rounded-full nav-pill">
            <a href="index.html" class="text-sm font-medium hover:opacity-70 transition-opacity nav-link">Home</a>
            <a href="shop.html" class="text-sm font-medium hover:opacity-70 transition-opacity nav-link">Shop</a>
            <a href="wishlist.html" class="text-sm font-medium hover:opacity-70 transition-opacity nav-link">Wishlist</a>
        </div>

        <div class="flex items-center gap-4 interaction-group">
            <!-- Dynamic Login/Account Toggle -->
            <div data-commerce="guest-only">
                <button class="p-2 hover:bg-white/10 rounded-full transition-colors login-btn" data-commerce="customer-login">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </button>
            </div>

            <div data-commerce="auth-only" style="display: none; align-items: center; gap: 8px;" class="auth-group">
                <a href="account.html" class="p-2 hover:bg-white/10 rounded-full transition-colors account-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </a>
                <button class="p-2 hover:bg-white/10 rounded-full transition-colors text-red-400 logout-btn"
                    data-commerce="customer-logout" title="Logout">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>

            <button class="relative p-2 hover:bg-white/10 rounded-full transition-colors group cart-btn" data-commerce="cart-toggle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span data-commerce="cart-count" class="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white scale-0 group-hover:scale-110 transition-transform duration-300 shadow-lg empty:hidden">0</span>
            </button>
        </div>
    </nav>
`;

const GLOBAL_FOOTER_HTML = `
    <footer class="site-footer">
        <div class="footer-grid">
            <div>
                <div class="footer-brand">AURA<span>STORE</span></div>
                <p class="footer-about">Premium fashion and lifestyle products, curated for the modern individual.
                    Quality meets timeless design.</p>
            </div>
            <div>
                <div class="footer-heading">Shop</div>
                <ul class="footer-links">
                    <li><a href="shop.html">All Products</a></li>
                    <li><a href="outerwear.html">Outerwear</a></li>
                    <li><a href="accessories.html">Accessories</a></li>
                    <li><a href="essentials.html">Essentials</a></li>
                </ul>
            </div>
            <div>
                <div class="footer-heading">Account</div>
                <ul class="footer-links">
                    <li data-commerce="guest-only"><a href="account.html">Sign In</a></li>
                    <li data-commerce="auth-only" style="display:none;"><a href="account.html">My Account</a></li>
                    <li><a href="wishlist.html">Wishlist</a></li>
                </ul>
            </div>
            <div>
                <div class="footer-heading">Info</div>
                <ul class="footer-links">
                    <li><a href="#">About Us</a></li>
                    <li><a href="#">Contact</a></li>
                    <li><a href="#">Privacy Policy</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p class="footer-copyright">&copy; 2026 AuraStore. All rights reserved. Powered by CommerceEngine.</p>
            <div class="footer-social">
                <a href="#" title="Twitter">𝕏</a>
                <a href="#" title="Instagram">📸</a>
                <a href="#" title="LinkedIn">💼</a>
            </div>
        </div>
    </footer>
`;

function initGlobalComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = GLOBAL_HEADER_HTML;
    }

    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = GLOBAL_FOOTER_HTML;
    }

    // Common binding logic
    if (window.__commerceEngine) {
        if (headerPlaceholder) window.__commerceEngine.bindButtons(headerPlaceholder);
        if (footerPlaceholder) window.__commerceEngine.bindButtons(footerPlaceholder);
    }

    // Global scroll listener for header
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('main-nav');
        if (!nav) return;
        
        if (window.scrollY > 50) {
            nav.classList.add('nav-scrolled');
        } else {
            nav.classList.remove('nav-scrolled');
        }
    });

    // Synchronize active nav link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('font-bold', 'opacity-100');
        }
    });
}

// --- Universal Shop Filter Logic ---
window.toggleAttributeFilter = function(el, type) {
    const parent = el.parentElement;
    const isActive = el.classList.contains('active');
    
    // Deactivate others in same group
    parent.querySelectorAll('.active').forEach(item => item.classList.remove('active'));
    
    if (!isActive) {
        el.classList.add('active');
    }
    
    applySidebarFilters();
};

window.applySidebarFilters = function() {
    const grid = document.querySelector('[data-commerce="product-list"]');
    if (!grid) return;

    const minPriceEl = document.getElementById('min-price');
    const maxPriceEl = document.getElementById('max-price');
    const sortEl = document.querySelector('input[name="shop-sort"]:checked');
    
    // Attribute filters
    const activeColor = document.querySelector('#color-filters .active')?.getAttribute('data-value');
    const activeSize = document.querySelector('#size-filters .active')?.getAttribute('data-value');
    const inStockOnly = document.getElementById('filter-stock')?.checked;
    const onSaleOnly = document.getElementById('filter-sale')?.checked;

    if (minPriceEl) {
        if (minPriceEl.value) grid.setAttribute('data-min-price', minPriceEl.value);
        else grid.removeAttribute('data-min-price');
    }

    if (maxPriceEl) {
        if (maxPriceEl.value) grid.setAttribute('data-max-price', maxPriceEl.value);
        else grid.removeAttribute('data-max-price');
    }

    if (sortEl) grid.setAttribute('data-sort', sortEl.value);
    
    if (activeColor) grid.setAttribute('data-color', activeColor);
    else grid.removeAttribute('data-color');

    if (activeSize) grid.setAttribute('data-size', activeSize);
    else grid.removeAttribute('data-size');
    
    if (inStockOnly) grid.setAttribute('data-in-stock', 'true');
    else grid.removeAttribute('data-in-stock');

    if (onSaleOnly) grid.setAttribute('data-on-sale', 'true');
    else grid.removeAttribute('data-on-sale');

    if (window.__commerceEngine) {
        window.__commerceEngine.renderProductList();
    }
};

window.clearFilters = function() {
    const minPriceEl = document.getElementById('min-price');
    const maxPriceEl = document.getElementById('max-price');
    const defaultSortEl = document.querySelector('input[name="shop-sort"][value="newest"]');
    
    if (minPriceEl) minPriceEl.value = '';
    if (maxPriceEl) maxPriceEl.value = '';
    if (defaultSortEl) defaultSortEl.checked = true;
    
    // Clear active states
    document.querySelectorAll('.color-swatch.active, .size-pill-filter.active').forEach(el => el.classList.remove('active'));
    
    // Clear checkboxes
    const stockCheck = document.getElementById('filter-stock');
    const saleCheck = document.getElementById('filter-sale');
    if (stockCheck) stockCheck.checked = false;
    if (saleCheck) saleCheck.checked = false;

    applySidebarFilters();
};

window.filterShop = function(category, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const grid = document.querySelector('[data-commerce="product-list"]');
    if (grid) {
        if (category === 'all') grid.removeAttribute('data-category');
        else grid.setAttribute('data-category', category);
    }
    applySidebarFilters();
};

/**
 * Master Switch for Sidebar Filters
 * Reads data-enabled-filters="color,size,price" from .shop-sidebar
 * and shows/hides sections with data-filter-group attributes.
 */
function initSidebarFiltersConfiguration() {
    const sidebar = document.querySelector('.shop-sidebar');
    if (!sidebar) return;

    const enabledFiltersAttr = sidebar.getAttribute('data-enabled-filters');
    if (!enabledFiltersAttr) return; // If not provided, show all by default

    const enabledFilters = enabledFiltersAttr.split(',').map(f => f.trim().toLowerCase());
    const sections = sidebar.querySelectorAll('[data-filter-group]');
    
    sections.forEach(section => {
        const groupType = section.getAttribute('data-filter-group').toLowerCase();
        if (enabledFilters.includes(groupType) || enabledFilters.includes('all')) {
            section.style.display = '';
        } else {
            section.style.display = 'none';
        }
    });

    console.log('[AURA] Filter Configuration Applied:', enabledFilters);
}

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initGlobalComponents();
    initSidebarFiltersConfiguration();
});
