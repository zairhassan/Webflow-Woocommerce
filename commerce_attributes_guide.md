# Commerce Engine Attributes Guide

This document explains the usage of `data-commerce` and `data-field` attributes across the Aura Boutique storefront. These attributes provide the bridge between your Webflow-style HTML and the JavaScript Commerce Engine.

## 🟢 Global Elements (Header/Footer)
Used in `global.js` and across all navigation bars.

| Attribute | Purpose |
| :--- | :--- |
| `data-commerce="customer-login"` | Triggers the authentication modal in **Login** mode. |
| `data-commerce="customer-register"` | Triggers the authentication modal in **Registration** mode. |
| `data-commerce="customer-logout"` | Logs the current user out and clears the session. |
| `data-commerce="auth-only"` | Element is only visible when a user is **logged in**. |
| `data-commerce="guest-only"` | Element is only visible for **guests** (logged out). |
| `data-commerce="cart-toggle"` | Opens the side-drawer shopping cart. |
| `data-commerce="cart-count"` | Automatically displays the number of items in the cart. |

---

## 🏠 Home Page (`index.html`)

### Hero & Featured Sections
- `data-commerce="product-list"`: A container that the engine fills with products.
  - `data-type="featured"`: Tells the engine to fetch only featured items.
  - `data-limit="4"`: Restricts the display to 4 products.
- `data-commerce="product-template"`: A hidden `<template>` or `<div>` inside the list. The engine clones this for every product.
- `data-commerce="wishlist-toggle"`: Added to buttons to enable one-click "Save to Wishlist".

---

## 🛍️ Shop & Category Pages (`shop.html`, `accessories.html`, etc.)

- `data-commerce="product-filter"`: Automatically builds a sidebar with:
  - **Category List**: Syncs with backend categories.
  - **Price Range**: Min/Max filters.
  - **Sort Dropdown**: (Price, Newest, Name).
- `data-commerce="product-list"`:
  - `data-category="accessories"`: Used on category-specific pages to pre-filter results.

---

## 👕 Product Detail Page (`product.html`)

The engine looks for a `slug` in the URL (e.g., `product.html?slug=aura-vest`) and populates this page.

| Attribute | Logic |
| :--- | :--- |
| `data-commerce="product-detail"` | The main wrapper for the product content. |
| `data-field="title"` | Populates with the product name. |
| `data-field="price"` | Shows current price (and sale price if applicable). |
| `data-field="image"` | Updates the `src` (for `<img>`) or `background-image`. |
| `data-commerce="variant-selector"` | Injects buttons for **Color** and **Size**. |
| `data-commerce="quantity-input"` | Binds an input field to the "Add to Cart" quantity. |
| `data-commerce="add-to-cart"` | Adds the selected variant and quantity to the bag. |
| `data-commerce="recent-products"` | Renders the "Recently Viewed" section at the bottom. |

---

## 🛒 Cart & Checkout Flow (`cart.html`, `checkout.html`)

### Cart Page
- `data-commerce="cart-items"`: Where the list of products in the bag is rendered.
- `data-commerce="cart-total"` / `cart-subtotal`: Dynamic pricing labels.
- `data-commerce="coupon-input"` / `coupon-apply`: Logic for discount codes.

### Checkout Page
- `data-commerce="checkout-contact"`: Renders Name/Email fields + "Create Account" checkbox.
- `data-commerce="checkout-delivery"`: Renders the Shipping Address form.
- `data-commerce="checkout-payment"`: Mounts the secure **Stripe Card Element**.
- `data-commerce="checkout-submit"`: The final button that processes the payment.

---

## 👤 Member Account (`account.html`)

- `data-commerce="account-profile"`: Displays user details and allows editing.
- `data-commerce="account-orders"`: Renders a list of successful orders.
- `data-commerce="account-addresses"`: Allows managing multiple shipping addresses.
- `data-field="customer-name"`: Shows "Welcome, [Name]" in the dashboard.

---

## ❤️ Wishlist (`wishlist.html`)

- `data-commerce="wishlist-page"`: A specialized product list that only shows items saved by the user (or stored locally for guests).
