# AURA Commerce Engine — Integration Guide

> **Engine File:** `engine.js` v2.0  
> Works like LearnDash shortcodes — add HTML attributes, the engine handles everything.

---

## ⚡ Setup (One-Time, Header/Footer)

**Ek dafa header ya footer mein add karo, har page par automatically kaam karega.**

```html
<!-- Site-wide Header ya Footer mein add karo (sirf 1 dafa) -->
<script
  src="https://your-cdn.com/engine.js"
  data-api-url="https://api.yourstore.com"
  data-store-key="pk_live_YOUR_KEY"
  data-currency="$"
></script>
```

| Parameter | Required | Description |
|---|---|---|
| `data-api-url` | ✅ | Backend server URL |
| `data-store-key` | ✅ | Store public key (from dashboard) |
| `data-currency` | ❌ | Currency symbol (default: `$`) |

> **Important:** Script tag sirf **ek dafa** lagana hai — Webflow mein "Site Settings → Custom Code → Footer" mein paste karo. Engine khud har page scan karta hai.

---

## 🧭 Global Elements (Har Page Par — Header/Footer)

Ye elements ek dafa header/footer template mein daal do, har page par kaam karenge:

### Navigation Cart Button
```html
<button data-commerce="cart-toggle">
  🛒 <span data-commerce="cart-count">0</span>
</button>
```

### Auth Buttons (Login / Logout)
```html
<!-- Guest ko dikhao (logged out) -->
<div data-commerce="guest-only">
  <a data-commerce="customer-login">Sign In</a>
</div>

<!-- Logged-in user ko dikhao -->
<div data-commerce="auth-only">
  <a data-commerce="account-link" href="account.html">My Account</a>
  <button data-commerce="customer-logout">Logout</button>
</div>
```

### Search Bar
```html
<div data-commerce="search"></div>
```
> Auto-generates input + dropdown results. Min 2 characters to search.

---

## 📄 Page-by-Page Guide

---

### 🏠 Homepage (`index.html`)

**Purpose:** Hero section, featured products, new arrivals, category highlights.

#### Featured Products Grid
```html
<div data-commerce="product-list" data-type="featured" data-limit="4">
  <template data-commerce="product-template">
    <div data-product-id="">
      <a data-field="link"><img data-field="image"></a>
      <h3 data-field="title"></h3>
      <p data-field="price"></p>
      <span data-field="badge"></span>
      <button data-commerce="add-to-cart">Add to Bag</button>
      <button data-commerce="wishlist-toggle">♡</button>
    </div>
  </template>
</div>
```

**Available Filters (add/remove as needed):**

| Attribute | Effect | Example |
|---|---|---|
| *(none)* | Sab products show karo | `<div data-commerce="product-list">` |
| `data-type="featured"` | Sirf featured products | `<div data-commerce="product-list" data-type="featured">` |
| `data-type="sale"` | Sirf sale items | `<div data-commerce="product-list" data-type="sale">` |
| `data-category="outerwear"` | Sirf ek category | `<div data-commerce="product-list" data-category="outerwear">` |
| `data-limit="6"` | Max 6 products | `<div data-commerce="product-list" data-limit="6">` |
| **Combine** | Featured + 3 limit | `<div data-commerce="product-list" data-type="featured" data-limit="3">` |

#### Product Template Fields

Template ke andar ye `data-field` attributes use karo:

| data-field | Element | What it fills |
|---|---|---|
| `title` | `<h3>`, `<span>`, etc. | Product name |
| `price` | `<p>`, `<span>` | Price (with sale markup if applicable) |
| `image` | `<img>` | Product image `src` + `alt` |
| `link` | `<a>` | Link to product page (`product.html?slug=...`) |
| `badge` | `<span>` | "SALE" tag (agar sale hai) |
| `category` | `<span>` | Category name |
| `rating` | `<span>` | Star rating (★★★★☆) |
| `stock-status` | `<span>` | "In Stock" / "Out of Stock" |
| `description` | `<p>` | Short description |
| `sku` | `<span>` | Product SKU |

#### Result Count
```html
<p><span data-commerce="result-count"></span> products found</p>
```

---

### 🛍️ Shop Page (`shop.html`)

**Purpose:** Full product catalog with category filtering.

```html
<!-- Category Tabs (auto-generated) -->
<div data-commerce="category-filter"></div>

<!-- All Products -->
<div data-commerce="product-list">
  <template data-commerce="product-template">
    <div data-product-id="">
      <a data-field="link"><img data-field="image"></a>
      <h3 data-field="title"></h3>
      <p data-field="price"></p>
      <span data-field="badge"></span>
      <button data-commerce="add-to-cart">Add to Bag</button>
      <button data-commerce="wishlist-toggle">♡</button>
    </div>
  </template>
</div>
```

> `category-filter` automatically creates buttons for each category. Clicking filters the `product-list`.

---

### 🛡️ Advanced Sidebar Filters (New)

**Purpose:** Master control for which filters are visible to the user. Ideal for Webflow where you might not want to delete HTML.

#### Master Switch Attribute
Add this to your `<aside class="shop-sidebar">`:

| Attribute | Example | Effect |
|---|---|---|
| `data-enabled-filters` | `all` | Show all filters (default) |
| `data-enabled-filters` | `color,size` | Only show Color and Size sections |
| `data-enabled-filters` | `price,sort` | Only show Price Range and Sorting |

#### Group Labels
Ensure each sidebar section has the correct `data-filter-group`:

```html
<div class="sidebar-section" data-filter-group="price">...</div>
<div class="sidebar-section" data-filter-group="sort">...</div>
<div class="sidebar-section" data-filter-group="color">...</div>
<div class="sidebar-section" data-filter-group="size">...</div>
<div class="sidebar-section" data-filter-group="availability">...</div>
```

---

### 🔄 Variant Image Sync

The engine now **automatically** detects when an attribute filter (Color or Size) is selected.

*   **Logic:** If a user selects "Purple", the engine scans the matching variant for that product.
*   **Update:** It dynamically replaces the base image and price on the product card with the **Variant's Specific Image**.
*   **Benefit:** Zero code required — just ensure your variants have images in the backend.

---

### 📦 Product Detail Page (`product.html`)

**Purpose:** Single product view with variants, gallery, reviews.

**URL Format:** `product.html?slug=aura-puffer-jacket`

```html
<div data-commerce="product-detail">

  <!-- Basic Info -->
  <h1 data-field="title"></h1>
  <p data-field="description"></p>
  <img data-field="image">
  <span data-field="price"></span>
  <span data-field="sku"></span>
  <span data-field="stock-status"></span>
  <span data-field="rating"></span>

  <!-- Variants (auto-generated if product has variants) -->
  <div data-commerce="variant-options" data-attribute="Color"></div>
  <div data-commerce="variant-options" data-attribute="Size"></div>

  <!-- OR: All variants in one container -->
  <div data-commerce="variant-selector"></div>

  <!-- Quantity Selector -->
  <input data-commerce="quantity-input" type="number" value="1" min="1">

  <!-- Action Buttons -->
  <button data-commerce="add-to-cart">Add to Bag</button>
  <button data-commerce="wishlist-toggle" data-product-id="auto-set">
    ♡ Wishlist
  </button>

  <!-- Reviews Section (auto-populated) -->
  <div data-commerce="reviews"></div>

  <!-- Related Products -->
  <div data-commerce="product-list" data-type="related" data-limit="4">
    <template data-commerce="product-template">
      <!-- same template as shop page -->
    </template>
  </div>

</div>
```

**Variant Container Options:**

| Attribute | Description |
|---|---|
| `data-commerce="variant-selector"` | All variant groups in one box |
| `data-commerce="variant-options"` + `data-attribute="Color"` | Only Color options |
| `data-commerce="variant-options"` + `data-attribute="Size"` | Only Size options |
| `data-commerce="variants"` | Alias for `variant-selector` |

> **Note:** `data-product-id` on the `product-detail` container is **auto-set** by the engine after loading. You don't need to hardcode it.

---

### 🛒 Cart Page (`cart.html`)

**Purpose:** Full cart view with item management, coupons, checkout button.

```html
<!-- Cart Items (auto-rendered with +/- and remove buttons) -->
<div data-commerce="cart-items"></div>

<!-- Coupon -->
<input id="coupon-input" type="text" placeholder="Coupon Code">
<button class="coupon-apply-btn">Apply</button>

<!-- Totals -->
<div>
  <span>Subtotal:</span> <span data-commerce="cart-subtotal">$0.00</span>
</div>
<div>
  <span>Discount:</span> <span data-commerce="cart-discount">-$0.00</span>
</div>
<div>
  <span>Total:</span> <span data-commerce="cart-total">$0.00</span>
</div>

<!-- Checkout Button -->
<button data-commerce="checkout-btn">Proceed to Checkout</button>
```

| Attribute | What it shows |
|---|---|
| `data-commerce="cart-items"` | Full item list with images, qty, remove |
| `data-commerce="cart-subtotal"` | Subtotal before discount |
| `data-commerce="cart-discount"` | Applied coupon discount |
| `data-commerce="cart-total"` | Final total after discount |
| `data-commerce="cart-count"` | Number of items |
| `data-commerce="checkout-btn"` | Redirects to checkout page |

---

### 💳 Checkout Page (`checkout.html`)

**Purpose:** Collect shipping info, apply payment, create order.

```html
<!-- Customer Info -->
<input name="email" type="email" required>
<input name="fullName" type="text" required>
<input name="address" type="text" required>
<input name="city" type="text" required>
<input name="password" type="password" placeholder="Create account (optional)">

<!-- Payment Method -->
<label><input type="radio" name="paymentMethod" value="cod"> Cash on Delivery</label>
<label><input type="radio" name="paymentMethod" value="card"> Credit Card</label>

<!-- Stripe Card Element (auto-mounted) -->
<div id="card-element"></div>

<!-- Order Summary -->
<div data-commerce="cart-items"></div>
<span data-commerce="cart-subtotal"></span>
<span data-commerce="cart-discount"></span>
<span data-commerce="cart-total"></span>

<!-- Submit -->
<button data-commerce="checkout-submit">Complete Purchase</button>
```

> After successful checkout, redirects to `success.html?order=ORDER_ID`

---

### ❤️ Wishlist Page (`wishlist.html`)

**Purpose:** Show saved wishlist items with remove option.

**Rendering Logic (JavaScript required):**

```html
<div id="wishlist-items-container"></div>
<span id="wishlist-count">0 Items</span>

<script>
  async function renderWishlist() {
    const token = window.__commerceEngine.getCustomerToken();
    let items = [];

    if (token) {
      // Logged in: fetch from database
      const data = await window.__commerceEngine.api('/customer/wishlist');
      items = data.wishlist || [];
    } else {
      // Guest: fetch from local IDs
      const ids = window.__commerceEngine.getWishlist();
      if (ids.length > 0) {
        const data = await window.__commerceEngine.api(`/public/products?ids=${ids.join(',')}`);
        items = data.products || [];
      }
    }

    document.getElementById('wishlist-count').textContent = `${items.length} Items`;
    // ... render items into container
  }

  renderWishlist();
</script>
```

---

### 👤 Account Page (`account.html`)

**Purpose:** Customer profile, orders, addresses.

**JavaScript API Methods:**

```javascript
// Get profile
const profile = await window.__commerceEngine.getCustomer();

// Update profile
await window.__commerceEngine.updateProfile({ firstName: 'Ali', lastName: 'Khan' });

// Get orders
const data = await window.__commerceEngine.getOrders();
// data.orders = [{ id, status, total, items, createdAt }, ...]

// Addresses
const addrs = await window.__commerceEngine.getAddresses();
await window.__commerceEngine.addAddress({ address1: '123 Main', city: 'Lahore', postcode: '54000', country: 'PK' });
await window.__commerceEngine.updateAddress(id, { city: 'Karachi' });
await window.__commerceEngine.deleteAddress(id);

// Change password
await window.__commerceEngine.changePassword('oldPass', 'newPass');
```

**Orders Template (optional HTML approach):**

```html
<div data-commerce="account-orders-list">
  <div data-commerce="order-template" style="display:none">
    <span data-order-field="id"></span>
    <span data-order-field="date"></span>
    <span data-order-field="status"></span>
    <span data-order-field="total"></span>
    <span data-order-field="items"></span>
  </div>
</div>
```

---

### ✅ Success Page (`success.html`)

**Purpose:** Order confirmation after checkout.

```html
<h1>Thank You!</h1>
<p>Your order <strong id="order-id"></strong> has been placed.</p>
<a href="index.html">Continue Shopping</a>

<script>
  const orderId = new URLSearchParams(window.location.search).get('order');
  document.getElementById('order-id').textContent = orderId || '';
</script>
```

---

## 🔑 Quick Reference: All `data-commerce` Attributes

| Attribute | Where to Use | Purpose |
|---|---|---|
| `product-list` | Shop, Home | Product grid container |
| `product-template` | Inside `product-list` | Template cloned per product |
| `product-detail` | Product page | Single product container |
| `add-to-cart` | Product, Shop | Add to cart button |
| `cart-toggle` | Header (global) | Open/close cart sidebar |
| `cart-count` | Header (global) | Item count badge |
| `cart-sidebar` | Auto-created | Sliding cart panel |
| `cart-items` | Cart, Checkout | Rendered item list |
| `cart-subtotal` | Cart, Checkout | Subtotal amount |
| `cart-discount` | Cart, Checkout | Discount amount |
| `cart-total` | Cart, Checkout | Final total |
| `checkout-btn` | Cart | Go to checkout |
| `checkout-submit` | Checkout | Place order |
| `wishlist-toggle` | Product, Shop | Add/remove from wishlist |
| `quantity-input` | Product, Cart | Quantity number input |
| `variant-selector` | Product detail | All variant groups |
| `variant-options` | Product detail | Single variant group (+ `data-attribute`) |
| `reviews` | Product detail | Reviews section |
| `search` | Header (global) | Search bar with dropdown |
| `category-filter` | Shop | Category tab buttons |
| `result-count` | Shop | Number of products found |
| `customer-login` | Header (global) | Opens login modal |
| `customer-logout` | Header (global) | Logout button |
| `account-link` | Header (global) | Link to account page |
| `auth-only` | Header (global) | Visible only when logged in |
| `guest-only` | Header (global) | Visible only when logged out |
| `account-orders-list` | Account | Orders container |
| `order-template` | Account | Order row template |

---

## 🔗 API Endpoints

| Method | Endpoint | Auth? | Description |
|---|---|---|---|
| `GET` | `/public/products` | ❌ | List products (`?category`, `?featured`, `?onSale`, `?limit`, `?ids`, `?sort`) |
| `GET` | `/public/products/:slug` | ❌ | Single product |
| `GET` | `/public/categories` | ❌ | All categories |
| `GET` | `/public/search?q=` | ❌ | Search |
| `POST` | `/public/validate-coupon` | ❌ | Validate coupon |
| `POST` | `/customer/auth/login` | ❌ | Login |
| `POST` | `/customer/auth/register` | ❌ | Register |
| `GET` | `/customer/wishlist` | ✅ | Get wishlist |
| `POST` | `/customer/wishlist` | ✅ | Add to wishlist |
| `DELETE` | `/customer/wishlist/:id` | ✅ | Remove from wishlist |
| `GET` | `/customer/profile` | ✅ | Get profile |
| `PUT` | `/customer/profile` | ✅ | Update profile |
| `GET` | `/customer/orders` | ✅ | List orders |
| `GET/POST/PUT/DELETE` | `/customer/addresses` | ✅ | CRUD addresses |
| `POST` | `/checkout/create-payment-intent` | ❌ | Create order |

> All endpoints are prefixed with `/api/v1/`. Auth endpoints need `Authorization: Bearer <token>` header (auto-added by engine).
