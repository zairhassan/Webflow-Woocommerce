import { useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken } from './api';
import {
    LayoutDashboard,
    Package,
    FolderTree,
    Ticket,
    Users,
    ShoppingCart,
    Truck,
    Receipt,
    Settings,
    LogOut,
    Zap,
    Box,
    ChevronRight,
    CreditCard
} from 'lucide-react';

// --- APP ---
export default function App() {
    const [token, setTokenState] = useState(localStorage.getItem('wfc_token'));
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [store, setStore] = useState(null);

    useEffect(() => {
        if (token) {
            setToken(token);
            api('/auth/me').then(d => setStore(d.store)).catch(() => { clearToken(); setTokenState(null); });
        }
    }, [token]);

    const handleLogin = (t, s) => { setToken(t); setTokenState(t); setStore(s); };
    const handleLogout = () => { clearToken(); setTokenState(null); setStore(null); };

    if (!token) return <AuthPage onLogin={handleLogin} />;

    const pages = { dashboard: Dashboard, products: ProductsPage, categories: CategoriesPage, coupons: CouponsPage, customers: CustomersPage, orders: OrdersPage, shipping: ShippingPage, tax: TaxPage, payment: PaymentPage, settings: SettingsPage };
    const PageComponent = pages[currentPage] || Dashboard;

    return (
        <div className="app-layout">
            <Sidebar current={currentPage} onChange={setCurrentPage} store={store} onLogout={handleLogout} />
            <main className="main-content">
                <PageComponent store={store} setStore={setStore} />
            </main>
        </div>
    );
}

// --- SIDEBAR ---
function Sidebar({ current, onChange, store, onLogout }) {
    const items = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { id: 'products', icon: <Package size={20} />, label: 'Products' },
        { id: 'categories', icon: <FolderTree size={20} />, label: 'Categories' },
        { id: 'coupons', icon: <Ticket size={20} />, label: 'Coupons' },
        { id: 'customers', icon: <Users size={20} />, label: 'Customers' },
        { id: 'orders', icon: <ShoppingCart size={20} />, label: 'Orders' },
        { id: 'shipping', icon: <Truck size={20} />, label: 'Shipping' },
        { id: 'tax', icon: <Receipt size={20} />, label: 'Tax' },
        { id: 'payment', icon: <CreditCard size={20} />, label: 'Payment' },
        { id: 'settings', icon: <Settings size={20} />, label: 'Settings' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <Zap size={24} fill="currentColor" />
                </div>
                <div className="brand-info">
                    <span className="brand-text">Commerce Engine</span>
                    <span className="brand-subtext">Admin Control</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                {items.map(i => (
                    <button key={i.id} className={`nav-item ${current === i.id ? 'active' : ''}`} onClick={() => onChange(i.id)}>
                        <span className="nav-icon">{i.icon}</span>
                        <span className="nav-label">{i.label}</span>
                        {current === i.id && <ChevronRight size={14} className="active-indicator" />}
                    </button>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="store-badge">
                    <Box size={14} />
                    <span className="store-name">{store?.name || 'My Store'}</span>
                </div>
                <button className="btn-logout" onClick={onLogout}>
                    <LogOut size={14} />
                    Logout
                </button>
            </div>
        </aside>
    );
}

// --- AUTH PAGE ---
function AuthPage({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('[Auth] Login attempt started for:', form.email);
        setError(''); setLoading(true);
        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const body = isRegister ? form : { email: form.email, password: form.password };
            console.log('[Auth] Fetching from:', endpoint);
            const data = await api(endpoint, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
            console.log('[Auth] Login success:', data.store?.name);
            onLogin(data.token, data.store);
        } catch (err) {
            console.error('[Auth] Login failed:', err.message);
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">⚡</span>
                    <h1>{isRegister ? 'Create Store' : 'Welcome Back'}</h1>
                    <p>{isRegister ? 'Start selling in minutes' : 'Sign in to your dashboard'}</p>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    {isRegister && <input type="text" placeholder="Store Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />}
                    <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Loading...' : isRegister ? 'Create Store' : 'Sign In'}</button>
                </form>
                <p className="auth-switch">{isRegister ? 'Already have a store?' : "Don't have a store?"}{' '}<button onClick={() => { setIsRegister(!isRegister); setError(''); }}>{isRegister ? 'Sign In' : 'Create One'}</button></p>
            </div>
        </div>
    );
}

// --- DASHBOARD (Analytics) ---
function Dashboard({ store }) {
    const [kpis, setKpis] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [chartPeriod, setChartPeriod] = useState('30d');
    const [topProducts, setTopProducts] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [statusBreakdown, setStatusBreakdown] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api('/admin/analytics/overview').catch(() => ({ kpis: {} })),
            api(`/admin/analytics/revenue-chart?period=${chartPeriod}`).catch(() => ({ chartData: [] })),
            api('/admin/analytics/top-products?limit=5').catch(() => ({ topProducts: [] })),
            api('/admin/analytics/recent-orders').catch(() => ({ recentOrders: [] })),
            api('/admin/analytics/order-status').catch(() => ({ statusBreakdown: {} }))
        ]).then(([ov, ch, tp, ro, sb]) => {
            setKpis(ov.kpis || {});
            setChartData(ch.chartData || []);
            setTopProducts(tp.topProducts || []);
            setRecentOrders(ro.recentOrders || []);
            setStatusBreakdown(sb.statusBreakdown || {});
            setLoading(false);
        });
    }, [chartPeriod]);

    const apiKey = store?.apiKeys?.[0]?.publicKey || 'pk_...';
    const snippet = `<script src="https://your-cdn.com/engine.js" data-store-key="${apiKey}"></script>`;

    const kpiCards = [
        { icon: '\u{1F4B0}', label: 'Revenue (This Month)', value: `$${(kpis?.totalRevenue || 0).toFixed(2)}`, sub: kpis?.revenueGrowth != null ? `${kpis.revenueGrowth > 0 ? '+' : ''}${kpis.revenueGrowth}% vs last month` : null, color: kpis?.revenueGrowth >= 0 ? '#16a34a' : '#ef4444' },
        { icon: '\u{1F4C8}', label: 'Today', value: `$${(kpis?.todayRevenue || 0).toFixed(2)}`, sub: `${kpis?.todayOrders || 0} orders today`, color: '#2563eb' },
        { icon: '\u{1F6D2}', label: 'Total Orders', value: kpis?.totalOrders || 0, sub: `${kpis?.thisMonthOrders || 0} this month`, color: '#9333ea' },
        { icon: '\u{1F465}', label: 'Customers', value: kpis?.totalCustomers || 0, sub: `Avg order $${(kpis?.avgOrderValue || 0).toFixed(2)}`, color: '#ea580c' }
    ];

    const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map(d => d.revenue), 1) : 1;
    const statusColors = { pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#10b981', completed: '#16a34a', cancelled: '#ef4444', refunded: '#6b7280' };
    const totalStatusOrders = Object.values(statusBreakdown).reduce((s, v) => s + v, 0) || 1;

    if (loading) return <div className="page"><p>Loading analytics...</p></div>;

    return (
        <div className="page">
            <div className="page-header"><h1>Dashboard</h1><p>Welcome to {store?.name || 'your store'}</p></div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                {kpiCards.map((k, i) => (
                    <div key={i} className="card" style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ fontSize: 28, lineHeight: 1 }}>{k.icon}</div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{k.value}</div>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{k.label}</div>
                            {k.sub && <div style={{ fontSize: 12, color: k.color, marginTop: 4, fontWeight: 500 }}>{k.sub}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Revenue Chart */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0 }}>Revenue</h3>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['7d', '30d', '90d'].map(p => (
                            <button key={p} onClick={() => setChartPeriod(p)} style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: chartPeriod === p ? '#2563eb' : '#fff', color: chartPeriod === p ? '#fff' : '#666', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{p}</button>
                        ))}
                    </div>
                </div>
                {chartData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>No revenue data for this period</div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: chartData.length > 60 ? 1 : chartData.length > 30 ? 2 : 4, height: 180, borderBottom: '1px solid #e5e7eb', paddingBottom: 8, overflow: 'hidden' }}>
                        {chartData.map((d, i) => {
                            const h = Math.max((d.revenue / maxRevenue) * 160, d.revenue > 0 ? 4 : 0);
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${d.date}: $${d.revenue.toFixed(2)} (${d.orders} orders)`}>
                                    <div style={{ width: '100%', maxWidth: 24, height: h, background: 'linear-gradient(180deg, #3b82f6, #60a5fa)', borderRadius: '3px 3px 0 0', minWidth: 3, transition: 'height 0.3s ease' }} />
                                </div>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#999' }}>
                    <span>{chartData[0]?.date || ''}</span>
                    <span>{chartData[chartData.length - 1]?.date || ''}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                {/* Top Products */}
                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Top Selling Products</h3>
                    {topProducts.length === 0 ? <p style={{ color: '#999', fontSize: 14 }}>No sales data yet</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {topProducts.map((p, i) => {
                                const maxRev = topProducts[0]?.totalRevenue || 1;
                                return (
                                    <div key={p.productId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : '#e5e7eb', color: i < 3 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                                            <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 4 }}>
                                                <div style={{ height: 4, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: 2, width: `${(p.totalRevenue / maxRev * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>${p.totalRevenue.toFixed(2)}</div>
                                            <div style={{ fontSize: 11, color: '#999' }}>{p.totalSold} sold</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Order Status Breakdown */}
                <div className="card" style={{ padding: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Order Status</h3>
                    {totalStatusOrders <= 1 && Object.keys(statusBreakdown).length === 0 ? <p style={{ color: '#999', fontSize: 14 }}>No orders yet</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {Object.entries(statusBreakdown).filter(([, v]) => v > 0).map(([status, count]) => (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[status] || '#ccc', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, flex: 1, textTransform: 'capitalize' }}>{status}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, width: 30, textAlign: 'right' }}>{count}</span>
                                    <div style={{ width: 80, height: 6, background: '#f0f0f0', borderRadius: 3 }}>
                                        <div style={{ height: 6, borderRadius: 3, background: statusColors[status] || '#ccc', width: `${(count / totalStatusOrders * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Orders */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Recent Orders</h3>
                {recentOrders.length === 0 ? <p style={{ color: '#999', fontSize: 14 }}>No orders yet</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Order</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Customer</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Items</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Total</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map(o => (
                                <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>#{o.orderNumber || '\u2014'}</td>
                                    <td style={{ padding: '10px 12px' }}>{o.customer}</td>
                                    <td style={{ padding: '10px 12px', color: '#666' }}>{o.itemCount} items</td>
                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>${o.total.toFixed(2)}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: statusColors[o.status] + '20', color: statusColors[o.status] }}>{o.status}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', color: '#999', fontSize: 13 }}>{new Date(o.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Quick Setup */}
            <div className="card" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 12 }}>Quick Setup</h3>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>Add this to your Webflow site:</p>
                <pre className="code-block" style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, fontSize: 13, overflow: 'auto' }}>{snippet}</pre>
                <p style={{ fontSize: 13, color: '#666', marginTop: 10 }}>API Key: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{apiKey}</code></p>
            </div>
        </div>
    );
}


// --- PRODUCTS PAGE ---
function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({});
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null); // null = list, 'new' = create, product = edit
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [selected, setSelected] = useState([]);

    const loadProducts = useCallback(async (page = 1) => {
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (search) params.set('search', search);
            const data = await api(`/admin/products?${params}`);
            setProducts(data.products || []);
            setPagination(data.pagination || {});
        } catch (e) { console.error(e); }
    }, [search]);

    const loadMeta = async () => {
        try {
            const [catData, tagData] = await Promise.all([
                api('/admin/catalog/categories'),
                api('/admin/catalog/tags')
            ]);
            setCategories(catData.categories || []);
            setTags(tagData.tags || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadProducts(); loadMeta(); }, []);
    useEffect(() => { const t = setTimeout(() => loadProducts(), 300); return () => clearTimeout(t); }, [search]);

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        await api(`/admin/products/${id}`, { method: 'DELETE' });
        loadProducts();
    };

    const handleDuplicate = async (id) => {
        await api(`/admin/products/${id}/duplicate`, { method: 'POST' });
        loadProducts();
    };

    const handleBulk = async (action) => {
        if (selected.length === 0) return;
        await api('/admin/products/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, productIds: selected }) });
        setSelected([]);
        loadProducts();
    };

    const handleSaved = () => { setEditing(null); loadProducts(); };

    // If editing, show the tabbed editor
    if (editing !== null) {
        return <ProductEditor product={editing === 'new' ? null : editing} categories={categories} tags={tags} onSave={handleSaved} onCancel={() => setEditing(null)} />;
    }

    return (
        <div className="page">
            <div className="page-header">
                <div><h1>Products</h1><p>{pagination.total || 0} products</p></div>
                <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add Product</button>
            </div>

            <div className="toolbar">
                <input type="text" className="search-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
                {selected.length > 0 && (
                    <div className="bulk-actions">
                        <span>{selected.length} selected</span>
                        <button className="btn btn-sm" onClick={() => handleBulk('publish')}>Publish</button>
                        <button className="btn btn-sm" onClick={() => handleBulk('draft')}>Draft</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleBulk('delete')}>Delete</button>
                    </div>
                )}
            </div>

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" onChange={e => setSelected(e.target.checked ? products.map(p => p.id) : [])} checked={selected.length === products.length && products.length > 0} /></th>
                            <th>Image</th><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Categories</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(e.target.checked ? [...selected, p.id] : selected.filter(id => id !== p.id))} /></td>
                                <td><div className="product-thumb">{p.featuredImage ? <img src={p.featuredImage} alt="" /> : '📷'}</div></td>
                                <td><strong className="clickable" onClick={() => setEditing(p)}>{p.title}</strong>{p.productType !== 'simple' && <span className="badge badge-info">{p.productType}</span>}</td>
                                <td>{p.sku || '€”'}</td>
                                <td>
                                    <span className="price">${Number(p.basePrice).toFixed(2)}</span>
                                    {p.salePrice && <span className="sale-price">${Number(p.salePrice).toFixed(2)}</span>}
                                </td>
                                <td><span className={`badge badge-${p.stockStatus === 'instock' ? 'completed' : p.stockStatus === 'onbackorder' ? 'processing' : 'cancelled'}`}>{p.manageStock ? p.stockQuantity : p.stockStatus}</span></td>
                                <td>{p.productCategories?.map(pc => pc.category.name).join(', ') || '€”'}</td>
                                <td><span className={`badge badge-${p.isPublished ? 'completed' : 'pending'}`}>{p.isPublished ? 'Published' : 'Draft'}</span></td>
                                <td className="actions">
                                    <button className="btn btn-sm" onClick={() => setEditing(p)} title="Edit">✏️</button>
                                    <button className="btn btn-sm" onClick={() => handleDuplicate(p.id)} title="Duplicate">📋</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)} title="Delete">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && <p className="empty-text">No products found. Click "Add Product" to create one.</p>}
                {pagination.pages > 1 && (
                    <div className="pagination">
                        {Array.from({ length: pagination.pages }, (_, i) => (
                            <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`} onClick={() => loadProducts(i + 1)}>{i + 1}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- PRODUCT EDITOR ---
function ProductEditor({ product, categories, tags, onSave, onCancel }) {
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '', description: '', shortDescription: '', productType: 'simple',
        basePrice: '', salePrice: '', salePriceFrom: '', salePriceTo: '', costOfGoods: '',
        sku: '', barcode: '', manageStock: false, stockQuantity: 0, stockStatus: 'instock',
        backordersAllowed: 'no', lowStockThreshold: '', soldIndividually: false,
        weight: '', length: '', width: '', height: '', shippingClass: '',
        taxStatus: 'taxable', taxClass: '',
        featuredImage: '', galleryImages: [],
        seoTitle: '', seoDescription: '',
        purchaseNote: '', menuOrder: 0, enableReviews: true,
        externalUrl: '', buttonText: '',
        isPublished: true, isFeatured: false, visibility: 'visible',
        upsellIds: [], crossSellIds: [],
        categoryIds: [], tagIds: [], variants: [], metadata: {}
    });

    useEffect(() => {
        if (product && product !== 'new') {
            setForm({
                title: product.title || '', description: product.description || '', shortDescription: product.shortDescription || '',
                productType: product.productType || 'simple',
                basePrice: product.basePrice || '', salePrice: product.salePrice || '', salePriceFrom: product.salePriceFrom ? product.salePriceFrom.split('T')[0] : '', salePriceTo: product.salePriceTo ? product.salePriceTo.split('T')[0] : '', costOfGoods: product.costOfGoods || '',
                sku: product.sku || '', barcode: product.barcode || '', manageStock: product.manageStock || false, stockQuantity: product.stockQuantity || 0, stockStatus: product.stockStatus || 'instock', backordersAllowed: product.backordersAllowed || 'no', lowStockThreshold: product.lowStockThreshold || '', soldIndividually: product.soldIndividually || false,
                weight: product.weight || '', length: product.length || '', width: product.width || '', height: product.height || '', shippingClass: product.shippingClass || '',
                taxStatus: product.taxStatus || 'taxable', taxClass: product.taxClass || '',
                featuredImage: product.featuredImage || '', galleryImages: product.galleryImages || [],
                seoTitle: product.seoTitle || '', seoDescription: product.seoDescription || '',
                purchaseNote: product.purchaseNote || '', menuOrder: product.menuOrder || 0, enableReviews: product.enableReviews !== false,
                externalUrl: product.externalUrl || '', buttonText: product.buttonText || '',
                isPublished: product.isPublished !== false, isFeatured: product.isFeatured || false, visibility: product.visibility || 'visible',
                upsellIds: product.upsellIds || [], crossSellIds: product.crossSellIds || [],
                categoryIds: product.productCategories?.map(pc => pc.categoryId) || [],
                tagIds: product.productTags?.map(pt => pt.tagId) || [],
                variants: product.variants || [], metadata: product.metadata || {}
            });
        }
    }, [product]);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        try {
            const data = await api('/admin/products/upload/image', { method: 'POST', body: fd });
            if (field === 'featuredImage') {
                set('featuredImage', data.url);
            } else {
                set('galleryImages', [...form.galleryImages, data.url]);
            }
        } catch (err) { setError('Upload failed: ' + err.message); }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.basePrice) { setError('Title and price are required'); return; }
        setSaving(true); setError('');
        try {
            const url = product ? `/admin/products/${product.id}` : '/admin/products';
            const method = product ? 'PUT' : 'POST';
            await api(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            onSave();
        } catch (err) { setError(err.message); }
        setSaving(false);
    };

    const tabs = [
        { id: 'general', icon: '📝', label: 'General' },
        { id: 'inventory', icon: '📦', label: 'Inventory' },
        { id: 'shipping', icon: '🚚', label: 'Shipping' },
        { id: 'linked', icon: '🔗', label: 'Linked Products' },
        { id: 'attributes', icon: '🏷️', label: 'Attributes' },
        ...(form.productType === 'variable' ? [{ id: 'variations', icon: '🔀', label: 'Variations' }] : []),
        { id: 'advanced', icon: '⚙️', label: 'Advanced' }
    ];

    return (
        <div className="page">
            <div className="page-header">
                <div><h1>{product ? 'Edit Product' : 'New Product'}</h1><p>Fill in the product details below</p></div>
                <div className="header-actions">
                    <button className="btn" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
                </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="editor-layout">
                {/* Left: Main Editor */}
                <div className="editor-main">
                    {/* Title */}
                    <div className="card">
                        <input type="text" className="product-title-input" placeholder="Product name" value={form.title} onChange={e => set('title', e.target.value)} />
                        <div className="field-row">
                            <label>Product Type</label>
                            <select value={form.productType} onChange={e => set('productType', e.target.value)}>
                                <option value="simple">Simple product</option>
                                <option value="variable">Variable product</option>
                                <option value="grouped">Grouped product</option>
                                <option value="external">External/Affiliate</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="card">
                        <h3>Description</h3>
                        <textarea rows="6" placeholder="Full product description..." value={form.description} onChange={e => set('description', e.target.value)} />
                        <h4 style={{ marginTop: '16px' }}>Short Description</h4>
                        <textarea rows="3" placeholder="Brief product summary..." value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} />
                    </div>

                    {/* Tabbed Data Panel */}
                    <div className="card product-data-panel">
                        <div className="data-tabs">
                            {tabs.map(t => (
                                <button key={t.id} className={`data-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
                                    <span className="tab-icon">{t.icon}</span>{t.label}
                                </button>
                            ))}
                        </div>
                        <div className="data-tab-content">
                            {activeTab === 'general' && <GeneralTab form={form} set={set} />}
                            {activeTab === 'inventory' && <InventoryTab form={form} set={set} />}
                            {activeTab === 'shipping' && <ShippingTab form={form} set={set} />}
                            {activeTab === 'linked' && <LinkedTab form={form} set={set} />}
                            {activeTab === 'attributes' && <AttributesTab form={form} set={set} />}
                            {activeTab === 'variations' && <VariationsTab form={form} set={set} />}
                            {activeTab === 'advanced' && <AdvancedTab form={form} set={set} />}
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div className="editor-sidebar">
                    {/* Publish */}
                    <div className="card">
                        <h3>Publish</h3>
                        <div className="field-row"><label>Status</label>
                            <select value={form.isPublished ? 'published' : 'draft'} onChange={e => set('isPublished', e.target.value === 'published')}>
                                <option value="published">Published</option><option value="draft">Draft</option>
                            </select>
                        </div>
                        <div className="field-row"><label>Visibility</label>
                            <select value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                                <option value="visible">Catalog & Search</option><option value="catalog">Catalog only</option><option value="search">Search only</option><option value="hidden">Hidden</option>
                            </select>
                        </div>
                        <label className="checkbox-label"><input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} /> Featured Product</label>
                    </div>

                    {/* Featured Image */}
                    <div className="card">
                        <h3>Product Image</h3>
                        {form.featuredImage ? (
                            <div className="image-preview"><img src={form.featuredImage} alt="Product" /><button className="btn btn-sm btn-danger" onClick={() => set('featuredImage', '')}>Remove</button></div>
                        ) : (
                            <label className="upload-area"><input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'featuredImage')} hidden />📷 Click to upload</label>
                        )}
                    </div>

                    {/* Gallery */}
                    <div className="card">
                        <h3>Gallery</h3>
                        <div className="gallery-grid">
                            {form.galleryImages.map((img, i) => (
                                <div key={i} className="gallery-thumb">
                                    <img src={img} alt="" />
                                    <button className="remove-btn" onClick={() => set('galleryImages', form.galleryImages.filter((_, j) => j !== i))}>—</button>
                                </div>
                            ))}
                            <label className="upload-thumb"><input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'gallery')} hidden />+</label>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="card">
                        <h3>Categories</h3>
                        <div className="checkbox-list">{categories.map(c => (
                            <label key={c.id} className="checkbox-label">
                                <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={e => set('categoryIds', e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter(id => id !== c.id))} />
                                {c.name}{c._count?.products > 0 && ` (${c._count.products})`}
                            </label>
                        ))}{categories.length === 0 && <p className="empty-text">No categories yet</p>}</div>
                    </div>

                    {/* Tags */}
                    <div className="card">
                        <h3>Tags</h3>
                        <div className="tag-list">{form.tagIds.map(tid => {
                            const tag = tags.find(t => t.id === tid);
                            return tag ? <span key={tid} className="tag">{tag.name}<button onClick={() => set('tagIds', form.tagIds.filter(id => id !== tid))}>—</button></span> : null;
                        })}</div>
                        <select onChange={e => { if (e.target.value && !form.tagIds.includes(e.target.value)) set('tagIds', [...form.tagIds, e.target.value]); e.target.value = ''; }}>
                            <option value="">+ Add tag</option>
                            {tags.filter(t => !form.tagIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* SEO */}
                    <div className="card">
                        <h3>SEO</h3>
                        <input type="text" placeholder="SEO Title" value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} />
                        <textarea rows="2" placeholder="Meta Description" value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} style={{ marginTop: '8px' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- PRODUCT DATA TABS ---
function GeneralTab({ form, set }) {
    return (
        <div className="tab-fields">
            {form.productType === 'external' && (
                <div className="field-group">
                    <div className="field-row"><label>Product URL</label><input type="url" placeholder="https://..." value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} /></div>
                    <div className="field-row"><label>Button Text</label><input type="text" placeholder="Buy product" value={form.buttonText} onChange={e => set('buttonText', e.target.value)} /></div>
                </div>
            )}
            <div className="field-group">
                <h4>Pricing</h4>
                <div className="field-grid-2">
                    <div className="field-row"><label>Regular Price ($)</label><input type="number" step="0.01" value={form.basePrice} onChange={e => set('basePrice', e.target.value)} /></div>
                    <div className="field-row"><label>Sale Price ($)</label><input type="number" step="0.01" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} /></div>
                </div>
                <div className="field-grid-2">
                    <div className="field-row"><label>Sale Start Date</label><input type="date" value={form.salePriceFrom} onChange={e => set('salePriceFrom', e.target.value)} /></div>
                    <div className="field-row"><label>Sale End Date</label><input type="date" value={form.salePriceTo} onChange={e => set('salePriceTo', e.target.value)} /></div>
                </div>
                <div className="field-row"><label>Cost of Goods ($)</label><input type="number" step="0.01" placeholder="For profit calculation" value={form.costOfGoods} onChange={e => set('costOfGoods', e.target.value)} /></div>
            </div>
            <div className="field-group">
                <h4>Tax</h4>
                <div className="field-grid-2">
                    <div className="field-row"><label>Tax Status</label>
                        <select value={form.taxStatus} onChange={e => set('taxStatus', e.target.value)}>
                            <option value="taxable">Taxable</option><option value="shipping">Shipping only</option><option value="none">None</option>
                        </select>
                    </div>
                    <div className="field-row"><label>Tax Class</label><input type="text" placeholder="Standard" value={form.taxClass} onChange={e => set('taxClass', e.target.value)} /></div>
                </div>
            </div>
        </div>
    );
}

function InventoryTab({ form, set }) {
    return (
        <div className="tab-fields">
            <div className="field-group">
                <div className="field-grid-2">
                    <div className="field-row"><label>SKU</label><input type="text" placeholder="Stock Keeping Unit" value={form.sku} onChange={e => set('sku', e.target.value)} /></div>
                    <div className="field-row"><label>Barcode (GTIN/UPC/EAN)</label><input type="text" placeholder="Barcode number" value={form.barcode} onChange={e => set('barcode', e.target.value)} /></div>
                </div>
            </div>
            <div className="field-group">
                <h4>Stock Management</h4>
                <label className="checkbox-label"><input type="checkbox" checked={form.manageStock} onChange={e => set('manageStock', e.target.checked)} /> Track stock quantity for this product</label>
                {form.manageStock && (
                    <>
                        <div className="field-row"><label>Stock Quantity</label><input type="number" value={form.stockQuantity} onChange={e => set('stockQuantity', parseInt(e.target.value) || 0)} /></div>
                        <div className="field-row"><label>Allow Backorders?</label>
                            <select value={form.backordersAllowed} onChange={e => set('backordersAllowed', e.target.value)}>
                                <option value="no">Do not allow</option><option value="notify">Allow, but notify customer</option><option value="yes">Allow</option>
                            </select>
                        </div>
                        <div className="field-row"><label>Low Stock Threshold</label><input type="number" placeholder="Store default" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} /></div>
                    </>
                )}
                {!form.manageStock && (
                    <div className="field-row"><label>Stock Status</label>
                        <select value={form.stockStatus} onChange={e => set('stockStatus', e.target.value)}>
                            <option value="instock">In stock</option><option value="outofstock">Out of stock</option><option value="onbackorder">On backorder</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="field-group">
                <label className="checkbox-label"><input type="checkbox" checked={form.soldIndividually} onChange={e => set('soldIndividually', e.target.checked)} /> Sold individually €” limit purchases to 1 per order</label>
            </div>
        </div>
    );
}

function ShippingTab({ form, set }) {
    return (
        <div className="tab-fields">
            <div className="field-group">
                <h4>Weight & Dimensions</h4>
                <div className="field-row"><label>Weight (kg)</label><input type="number" step="0.001" placeholder="0.000" value={form.weight} onChange={e => set('weight', e.target.value)} /></div>
                <div className="field-grid-3">
                    <div className="field-row"><label>Length (cm)</label><input type="number" step="0.01" value={form.length} onChange={e => set('length', e.target.value)} /></div>
                    <div className="field-row"><label>Width (cm)</label><input type="number" step="0.01" value={form.width} onChange={e => set('width', e.target.value)} /></div>
                    <div className="field-row"><label>Height (cm)</label><input type="number" step="0.01" value={form.height} onChange={e => set('height', e.target.value)} /></div>
                </div>
            </div>
            <div className="field-group">
                <div className="field-row"><label>Shipping Class</label><input type="text" placeholder="e.g. large-items" value={form.shippingClass} onChange={e => set('shippingClass', e.target.value)} /></div>
            </div>
        </div>
    );
}

function LinkedTab({ form, set }) {
    return (
        <div className="tab-fields">
            <div className="field-group">
                <h4>Upsells</h4>
                <p className="field-hint">Products to recommend on the product page</p>
                <input type="text" placeholder="Search products to add as upsells..." />
            </div>
            <div className="field-group">
                <h4>Cross-sells</h4>
                <p className="field-hint">Products to recommend in the cart</p>
                <input type="text" placeholder="Search products to add as cross-sells..." />
            </div>
        </div>
    );
}

function AttributesTab({ form, set }) {
    const [attrs, setAttrs] = useState(form.metadata?.attributes || []);
    const addAttr = () => setAttrs([...attrs, { name: '', values: '', usedForVariations: false }]);
    const updateAttr = (i, field, val) => { const n = [...attrs]; n[i][field] = val; setAttrs(n); set('metadata', { ...form.metadata, attributes: n }); };
    const removeAttr = (i) => { const n = attrs.filter((_, j) => j !== i); setAttrs(n); set('metadata', { ...form.metadata, attributes: n }); };

    return (
        <div className="tab-fields">
            <div className="field-group">
                {attrs.map((a, i) => (
                    <div key={i} className="attribute-row">
                        <input type="text" placeholder="Attribute name (e.g. Color)" value={a.name} onChange={e => updateAttr(i, 'name', e.target.value)} />
                        <input type="text" placeholder="Values separated by | (e.g. Red | Blue | Green)" value={a.values} onChange={e => updateAttr(i, 'values', e.target.value)} />
                        {form.productType === 'variable' && <label className="checkbox-label"><input type="checkbox" checked={a.usedForVariations} onChange={e => updateAttr(i, 'usedForVariations', e.target.checked)} /> Used for variations</label>}
                        <button className="btn btn-sm btn-danger" onClick={() => removeAttr(i)}>Remove</button>
                    </div>
                ))}
                <button className="btn btn-sm" onClick={addAttr}>+ Add Attribute</button>
            </div>
        </div>
    );
}

function VariationsTab({ form, set }) {
    const addVariant = () => set('variants', [...form.variants, { sku: '', price: '', salePrice: '', stockQuantity: 0, manageStock: false, stockStatus: 'instock', attributes: {}, imageUrl: '' }]);
    const updateVariant = (i, field, val) => { const n = [...form.variants]; n[i] = { ...n[i], [field]: val }; set('variants', n); };
    const removeVariant = (i) => set('variants', form.variants.filter((_, j) => j !== i));

    const generateVariations = () => {
        if (!form.metadata?.attributes) return;
        const varAttrs = form.metadata.attributes.filter(a => a.usedForVariations && a.name && a.values);
        if (varAttrs.length === 0) return alert('No attributes marked for variations. Add some in the Attributes tab first.');

        const parseValues = (str) => str.split('|').map(s => s.trim()).filter(Boolean);
        let permutations = [{}];

        for (const attr of varAttrs) {
            const values = parseValues(attr.values);
            const newPerms = [];
            for (const p of permutations) {
                for (const v of values) {
                    newPerms.push({ ...p, [attr.name]: v });
                }
            }
            permutations = newPerms;
        }

        const newVariants = permutations.map(attrs => ({
            sku: form.sku ? `${form.sku}-${Object.values(attrs).join('-').substring(0, 8)}` : '',
            price: form.basePrice || '',
            salePrice: form.salePrice || '',
            stockQuantity: 0,
            manageStock: false,
            stockStatus: 'instock',
            attributes: attrs,
            imageUrl: ''
        }));

        set('variants', newVariants);
    };

    const handleVariantImageUpload = async (e, i) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        try {
            const data = await api('/admin/products/upload/image', { method: 'POST', body: fd });
            updateVariant(i, 'imageUrl', data.url);
        } catch (err) { alert('Upload failed: ' + err.message); }
    };

    return (
        <div className="tab-fields">
            <div className="field-group">
                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>Generate variations from attributes marked for variations.</p>
                    <button className="btn btn-sm btn-outline" onClick={generateVariations}>⚙️ Generate Automatically</button>
                </div>
                {form.variants.map((v, i) => (
                    <div key={i} className="variation-card">
                        <div className="variation-header">
                            <div>
                                <strong>Variation #{i + 1}</strong>
                                {Object.keys(v.attributes || {}).length > 0 && (
                                    <span style={{ marginLeft: '10px', fontSize: '13px', color: '#666' }}>
                                        ({Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')})
                                    </span>
                                )}
                            </div>
                            <button className="btn btn-sm btn-danger" onClick={() => removeVariant(i)}>Remove</button>
                        </div>
                        <div className="field-grid-3">
                            <div className="field-row"><label>SKU</label><input type="text" value={v.sku || ''} onChange={e => updateVariant(i, 'sku', e.target.value)} /></div>
                            <div className="field-row"><label>Price ($)</label><input type="number" step="0.01" value={v.price || ''} onChange={e => updateVariant(i, 'price', e.target.value)} /></div>
                            <div className="field-row"><label>Sale Price ($)</label><input type="number" step="0.01" value={v.salePrice || ''} onChange={e => updateVariant(i, 'salePrice', e.target.value)} /></div>
                        </div>
                        <div className="field-row" style={{ marginTop: '10px', marginBottom: '10px' }}>
                            <label>Variant Image</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {v.imageUrl ? (
                                    <div style={{ position: 'relative', width: '60px', height: '60px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                                        <img src={v.imageUrl} alt="Variant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '60px', height: '60px', border: '1px dashed #ccc', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '10px', textAlign: 'center' }}>No<br />Image</div>
                                )}
                                <div>
                                    <label className="btn btn-sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                        Upload Image
                                        <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(e, i)} hidden />
                                    </label>
                                    {v.imageUrl && (
                                        <button className="btn btn-sm btn-danger" style={{ marginLeft: '10px' }} onClick={() => updateVariant(i, 'imageUrl', '')}>Remove</button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="field-grid-2">
                            <div className="field-row"><label>Stock Qty</label><input type="number" value={v.stockQuantity || 0} onChange={e => updateVariant(i, 'stockQuantity', parseInt(e.target.value) || 0)} /></div>
                            <div className="field-row"><label>Status</label>
                                <select value={v.stockStatus} onChange={e => updateVariant(i, 'stockStatus', e.target.value)}>
                                    <option value="instock">In stock</option><option value="outofstock">Out of stock</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
                <button className="btn btn-sm" onClick={addVariant}>+ Add Custom Variation</button>
            </div>
        </div>
    );
}

function AdvancedTab({ form, set }) {
    return (
        <div className="tab-fields">
            <div className="field-group">
                <div className="field-row"><label>Purchase Note</label><textarea rows="3" placeholder="Note to customer after purchase..." value={form.purchaseNote} onChange={e => set('purchaseNote', e.target.value)} /></div>
                <div className="field-row"><label>Menu Order</label><input type="number" value={form.menuOrder} onChange={e => set('menuOrder', parseInt(e.target.value) || 0)} /></div>
                <label className="checkbox-label"><input type="checkbox" checked={form.enableReviews} onChange={e => set('enableReviews', e.target.checked)} /> Enable reviews</label>
            </div>
        </div>
    );
}

// --- CATEGORIES PAGE ---
function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [catForm, setCatForm] = useState({ name: '', description: '' });
    const [tagForm, setTagForm] = useState({ name: '' });
    const [tab, setTab] = useState('categories');

    const loadData = async () => {
        try {
            const [catData, tagData] = await Promise.all([
                api('/admin/catalog/categories'),
                api('/admin/catalog/tags')
            ]);
            setCategories(catData.categories || []);
            setTags(tagData.tags || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadData(); }, []);

    const addCategory = async (e) => {
        e.preventDefault();
        if (!catForm.name) return;
        await api('/admin/catalog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) });
        setCatForm({ name: '', description: '' });
        loadData();
    };

    const addTag = async (e) => {
        e.preventDefault();
        if (!tagForm.name) return;
        await api('/admin/catalog/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tagForm) });
        setTagForm({ name: '' });
        loadData();
    };

    const deleteCategory = async (id) => { await api(`/admin/catalog/categories/${id}`, { method: 'DELETE' }); loadData(); };
    const deleteTag = async (id) => { await api(`/admin/catalog/tags/${id}`, { method: 'DELETE' }); loadData(); };

    return (
        <div className="page">
            <div className="page-header"><h1>Catalog</h1><p>Manage categories and tags</p></div>
            <div className="tab-bar">
                <button className={`tab-btn ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>📁‚ Categories</button>
                <button className={`tab-btn ${tab === 'tags' ? 'active' : ''}`} onClick={() => setTab('tags')}>Ÿ️ Tags</button>
            </div>

            {tab === 'categories' && (
                <div className="grid-2">
                    <div className="card">
                        <h3>Add Category</h3>
                        <form onSubmit={addCategory}>
                            <input type="text" placeholder="Category Name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                            <textarea placeholder="Description (optional)" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} rows="3" style={{ marginTop: '8px' }} />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Add Category</button>
                        </form>
                    </div>
                    <div className="card">
                        <h3>Categories ({categories.length})</h3>
                        <table className="table"><thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Actions</th></tr></thead>
                            <tbody>{categories.map(c => (
                                <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.slug}</td><td>{c._count?.products || 0}</td>
                                    <td><button className="btn btn-sm btn-danger" onClick={() => deleteCategory(c.id)}>🗑️</button></td></tr>
                            ))}</tbody></table>
                        {categories.length === 0 && <p className="empty-text">No categories yet</p>}
                    </div>
                </div>
            )}

            {tab === 'tags' && (
                <div className="grid-2">
                    <div className="card">
                        <h3>Add Tag</h3>
                        <form onSubmit={addTag}>
                            <input type="text" placeholder="Tag Name" value={tagForm.name} onChange={e => setTagForm({ name: e.target.value })} required />
                            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Add Tag</button>
                        </form>
                    </div>
                    <div className="card">
                        <h3>Tags ({tags.length})</h3>
                        <div className="tag-cloud">{tags.map(t => (
                            <span key={t.id} className="tag">{t.name} ({t._count?.products || 0})<button onClick={() => deleteTag(t.id)}>—</button></span>
                        ))}</div>
                        {tags.length === 0 && <p className="empty-text">No tags yet</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- ORDERS PAGE ---
function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({});

    const loadOrders = async (page = 1) => {
        const data = await api(`/admin/orders?page=${page}&limit=20`);
        setOrders(data.orders || []);
        setPagination(data.pagination || {});
    };

    useEffect(() => { loadOrders(); }, []);

    const updateStatus = async (id, status) => {
        await api(`/admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        loadOrders();
    };

    return (
        <div className="page">
            <div className="page-header"><h1>Orders</h1><p>{pagination.total || 0} orders</p></div>
            <div className="card">
                <table className="table">
                    <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>{orders.map(o => (
                        <tr key={o.id}>
                            <td><strong>#{o.id.slice(0, 8)}</strong></td>
                            <td>{o.customerName || o.customerEmail}</td>
                            <td>{o.items?.length || 0} items</td>
                            <td>${Number(o.totalAmount).toFixed(2)}</td>
                            <td><select className="status-select" value={o.status} onChange={e => updateStatus(o.id, e.target.value)}>
                                <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                            </select></td>
                            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td><button className="btn btn-sm">View</button></td>
                        </tr>
                    ))}</tbody>
                </table>
                {orders.length === 0 && <p className="empty-text">No orders yet</p>}
            </div>
        </div>
    );
}


// --- COUPONS PAGE ---
function CouponsPage() {
    const [coupons, setCoupons] = useState([]);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const emptyForm = {
        code: '', description: '', discountType: 'percentage', amount: '',
        freeShipping: false, expiryDate: '', minimumSpend: '', maximumSpend: '',
        individualUseOnly: false, excludeSaleItems: false,
        usageLimit: '', usageLimitPerUser: ''
    };
    const [form, setForm] = useState({ ...emptyForm });

    const loadCoupons = async () => {
        try {
            const data = await api('/admin/coupons');
            setCoupons(data.coupons || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadCoupons(); }, []);

    const startEdit = (coupon) => {
        setForm({
            code: coupon.code || '', description: coupon.description || '',
            discountType: coupon.discountType || 'percentage', amount: coupon.amount || '',
            freeShipping: coupon.freeShipping || false,
            expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '',
            minimumSpend: coupon.minimumSpend || '', maximumSpend: coupon.maximumSpend || '',
            individualUseOnly: coupon.individualUseOnly || false, excludeSaleItems: coupon.excludeSaleItems || false,
            usageLimit: coupon.usageLimit || '', usageLimitPerUser: coupon.usageLimitPerUser || ''
        });
        setEditing(coupon);
    };

    const handleSave = async () => {
        if (!form.code || !form.amount) { setError('Code and amount are required'); return; }
        setSaving(true); setError('');
        try {
            if (editing && editing !== 'new') {
                await api(`/admin/coupons/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await api('/admin/coupons', { method: 'POST', body: JSON.stringify(form) });
            }
            setEditing(null); setForm({ ...emptyForm }); loadCoupons();
        } catch (err) { setError(err.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this coupon?')) return;
        await api(`/admin/coupons/${id}`, { method: 'DELETE' });
        loadCoupons();
    };

    if (editing !== null) {
        return (
            <div className="page">
                <div className="page-header">
                    <div><h1>{editing === 'new' ? 'Add Coupon' : 'Edit Coupon'}</h1></div>
                    <div className="header-actions">
                        <button className="btn" onClick={() => { setEditing(null); setForm({ ...emptyForm }); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Coupon'}</button>
                    </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}

                <div className="editor-layout">
                    <div className="editor-main">
                        <div className="card">
                            <h3>General</h3>
                            <div className="field-grid-2">
                                <div className="field-row">
                                    <label>Coupon Code</label>
                                    <input type="text" placeholder="e.g. SUMMER20" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="field-row">
                                    <label>Discount Type</label>
                                    <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>
                                        <option value="percentage">Percentage discount</option>
                                        <option value="fixed_cart">Fixed cart discount</option>
                                        <option value="fixed_product">Fixed product discount</option>
                                    </select>
                                </div>
                            </div>
                            <div className="field-grid-2">
                                <div className="field-row">
                                    <label>Amount {form.discountType === 'percentage' ? '(%)' : '($)'}</label>
                                    <input type="number" step="0.01" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="field-row">
                                    <label>Expiry Date</label>
                                    <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
                                </div>
                            </div>
                            <label className="checkbox-label"><input type="checkbox" checked={form.freeShipping} onChange={e => setForm({ ...form, freeShipping: e.target.checked })} /> Allow free shipping</label>
                            <div className="field-row" style={{ marginTop: '12px' }}>
                                <label>Description</label>
                                <textarea rows="2" placeholder="Optional description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                        </div>

                        <div className="card">
                            <h3>Usage Restrictions</h3>
                            <div className="field-grid-2">
                                <div className="field-row"><label>Minimum Spend ($)</label><input type="number" step="0.01" placeholder="No minimum" value={form.minimumSpend} onChange={e => setForm({ ...form, minimumSpend: e.target.value })} /></div>
                                <div className="field-row"><label>Maximum Spend ($)</label><input type="number" step="0.01" placeholder="No maximum" value={form.maximumSpend} onChange={e => setForm({ ...form, maximumSpend: e.target.value })} /></div>
                            </div>
                            <label className="checkbox-label"><input type="checkbox" checked={form.individualUseOnly} onChange={e => setForm({ ...form, individualUseOnly: e.target.checked })} /> Individual use only (cannot be combined with other coupons)</label>
                            <label className="checkbox-label"><input type="checkbox" checked={form.excludeSaleItems} onChange={e => setForm({ ...form, excludeSaleItems: e.target.checked })} /> Exclude sale items</label>
                        </div>

                        <div className="card">
                            <h3>Usage Limits</h3>
                            <div className="field-grid-2">
                                <div className="field-row"><label>Usage limit per coupon</label><input type="number" placeholder="Unlimited" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} /></div>
                                <div className="field-row"><label>Usage limit per user</label><input type="number" placeholder="Unlimited" value={form.usageLimitPerUser} onChange={e => setForm({ ...form, usageLimitPerUser: e.target.value })} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="editor-sidebar">
                        <div className="card">
                            <h3>Coupon Summary</h3>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                                <p><strong>Code:</strong> {form.code || '—'}</p>
                                <p><strong>Type:</strong> {form.discountType === 'percentage' ? 'Percentage' : form.discountType === 'fixed_cart' ? 'Fixed Cart' : 'Fixed Product'}</p>
                                <p><strong>Amount:</strong> {form.amount ? (form.discountType === 'percentage' ? `${form.amount}%` : `$${form.amount}`) : '—'}</p>
                                {form.expiryDate && <p><strong>Expires:</strong> {form.expiryDate}</p>}
                                {form.freeShipping && <p>🚚 Free shipping included</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div><h1>Coupons</h1><p>{coupons.length} coupons</p></div>
                <button className="btn btn-primary" onClick={() => { setForm({ ...emptyForm }); setEditing('new'); }}>+ Add Coupon</button>
            </div>

            <div className="card">
                <table className="table">
                    <thead><tr><th>Code</th><th>Type</th><th>Amount</th><th>Expiry</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{coupons.map(c => (
                        <tr key={c.id}>
                            <td><strong className="clickable" onClick={() => startEdit(c)}>{c.code}</strong></td>
                            <td>{c.discountType === 'percentage' ? 'Percentage' : c.discountType === 'fixed_cart' ? 'Fixed Cart' : 'Fixed Product'}</td>
                            <td>{c.discountType === 'percentage' ? `${c.amount}%` : `$${Number(c.amount).toFixed(2)}`}</td>
                            <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'No expiry'}</td>
                            <td>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                            <td><span className={`badge ${c.isActive ? 'badge-completed' : 'badge-cancelled'}`}>{c.isActive ? 'Active' : 'Disabled'}</span></td>
                            <td className="actions">
                                <button className="btn btn-sm" onClick={() => startEdit(c)} title="Edit">✏️</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} title="Delete">️</button>
                            </td>
                        </tr>
                    ))}</tbody>
                </table>
                {coupons.length === 0 && <p className="empty-text">No coupons yet. Click "Add Coupon" to create one.</p>}
            </div>
        </div>
    );
}

// --- CUSTOMERS PAGE ---
function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({});
    const [search, setSearch] = useState('');
    const [viewing, setViewing] = useState(null);
    const [detail, setDetail] = useState(null);

    const loadCustomers = async (page = 1) => {
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (search) params.set('search', search);
            const data = await api(`/admin/customers?${params}`);
            setCustomers(data.customers || []);
            setPagination(data.pagination || {});
        } catch (e) { console.error(e); }
    };

    const loadDetail = async (id) => {
        try {
            const data = await api(`/admin/customers/${id}`);
            setDetail(data.customer);
            setViewing(id);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadCustomers(); }, []);
    useEffect(() => { const t = setTimeout(() => loadCustomers(), 300); return () => clearTimeout(t); }, [search]);

    if (viewing && detail) {
        return (
            <div className="page">
                <div className="page-header">
                    <div>
                        <h1>{detail.firstName || ''} {detail.lastName || detail.email}</h1>
                        <p>Customer since {new Date(detail.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button className="btn" onClick={() => { setViewing(null); setDetail(null); }}>← Back to Customers</button>
                </div>

                <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon">💰</div><div className="stat-info"><span className="stat-value">{detail._count?.orders || 0}</span><span className="stat-label">Orders</span></div></div>
                    <div className="stat-card"><div className="stat-icon">🛒</div><div className="stat-info"><span className="stat-value">{detail._count?.reviews || 0}</span><span className="stat-label">Reviews</span></div></div>
                    <div className="stat-card"><div className="stat-icon">📦</div><div className="stat-info"><span className="stat-value">{detail.addresses?.length || 0}</span><span className="stat-label">Addresses</span></div></div>
                </div>

                <div className="grid-2">
                    <div className="card">
                        <h3>Contact Info</h3>
                        <div className="field-row"><label>Email</label><p>{detail.email}</p></div>
                        <div className="field-row"><label>Phone</label><p>{detail.phone || '—'}</p></div>
                        <div className="field-row"><label>Name</label><p>{[detail.firstName, detail.lastName].filter(Boolean).join(' ') || '—'}</p></div>
                    </div>

                    <div className="card">
                        <h3>Addresses ({detail.addresses?.length || 0})</h3>
                        {detail.addresses?.map(a => (
                            <div key={a.id} style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                                <strong>{a.type === 'billing' ? '🏢 Billing' : '🚚 Shipping'} {a.isDefault && '(Default)'}</strong>
                                <p>{a.firstName} {a.lastName}</p>
                                <p>{a.address1}{a.address2 ? `, ${a.address2}` : ''}</p>
                                <p>{a.city}, {a.state} {a.postcode}</p>
                                <p>{a.country}</p>
                            </div>
                        ))}
                        {(!detail.addresses || detail.addresses.length === 0) && <p className="empty-text">No addresses saved</p>}
                    </div>
                </div>

                <div className="card">
                    <h3>Recent Orders</h3>
                    <table className="table">
                        <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
                        <tbody>{(detail.orders || []).map(o => (
                            <tr key={o.id}>
                                <td><strong>#{o.id.slice(0, 8)}</strong></td>
                                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>{o.items?.length || 0} items</td>
                                <td>${Number(o.totalAmount).toFixed(2)}</td>
                                <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                            </tr>
                        ))}</tbody>
                    </table>
                    {(!detail.orders || detail.orders.length === 0) && <p className="empty-text">No orders yet</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div><h1>Customers</h1><p>{pagination.total || 0} customers</p></div>
            </div>

            <div className="toolbar">
                <input type="text" className="search-input" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="card">
                <table className="table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Registered</th><th>Actions</th></tr></thead>
                    <tbody>{customers.map(c => (
                        <tr key={c.id}>
                            <td><strong className="clickable" onClick={() => loadDetail(c.id)}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</strong></td>
                            <td>{c.email}</td>
                            <td>{c.phone || '—'}</td>
                            <td>{c._count?.orders || 0}</td>
                            <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                            <td><button className="btn btn-sm" onClick={() => loadDetail(c.id)}>View</button></td>
                        </tr>
                    ))}</tbody>
                </table>
                {customers.length === 0 && <p className="empty-text">No customers yet</p>}
                {pagination.pages > 1 && (
                    <div className="pagination">
                        {Array.from({ length: pagination.pages }, (_, i) => (
                            <button key={i} className={`btn btn-sm ${pagination.page === i + 1 ? 'btn-primary' : ''}`} onClick={() => loadCustomers(i + 1)}>{i + 1}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}




function ShippingPage({ store }) {
    const [zones, setZones] = useState([]);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadZones = useCallback(async () => {
        try {
            const d = await api('/admin/shipping');
            setZones(d.zones || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);
    useEffect(() => { loadZones(); }, [loadZones]);

    const defaultZone = { name: '', regions: [], methods: [] };
    const [form, setForm] = useState(defaultZone);

    const startEdit = (zone) => {
        setForm({ name: zone.name, regions: zone.regions || [], methods: zone.methods || [] });
        setEditing(zone);
    };
    const startNew = () => { setForm({ ...defaultZone }); setEditing('new'); };
    const cancelEdit = () => { setEditing(null); setForm({ ...defaultZone }); };

    const handleSave = async () => {
        try {
            if (editing === 'new') {
                await api('/admin/shipping', { method: 'POST', body: JSON.stringify(form) });
            } else {
                await api(`/admin/shipping/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            cancelEdit();
            loadZones();
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this shipping zone?')) return;
        try {
            await api(`/admin/shipping/${id}`, { method: 'DELETE' });
            loadZones();
        } catch (e) { alert(e.message); }
    };

    // Region helpers
    const addRegion = () => {
        const code = prompt('Enter country code (e.g., US) or country:state (e.g., US:CA) or * for all:');
        if (code) setForm({ ...form, regions: [...form.regions, code.toUpperCase()] });
    };
    const removeRegion = (i) => setForm({ ...form, regions: form.regions.filter((_, idx) => idx !== i) });

    // Method helpers
    const addMethod = (type) => {
        const m = { type, title: type === 'flat_rate' ? 'Flat Rate' : type === 'free_shipping' ? 'Free Shipping' : 'Local Pickup', cost: 0, freeAbove: null, enabled: true };
        setForm({ ...form, methods: [...form.methods, m] });
    };
    const updateMethod = (i, key, val) => {
        const methods = [...form.methods];
        methods[i] = { ...methods[i], [key]: val };
        setForm({ ...form, methods });
    };
    const removeMethod = (i) => setForm({ ...form, methods: form.methods.filter((_, idx) => idx !== i) });

    if (editing !== null) {
        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <button onClick={cancelEdit} className="btn-secondary">← Back</button>
                    <h2>{editing === 'new' ? 'New Shipping Zone' : 'Edit Shipping Zone'}</h2>
                </div>

                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Zone Details</h3>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Zone Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. United States" className="form-input" />
                </div>

                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Regions</h3>
                    <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                        Country codes (US, GB, CA), state codes (US:CA, US:NY), or * for everywhere.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {form.regions.map((r, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#e3f2fd', borderRadius: 4, fontSize: 13, fontWeight: 500 }}>
                                {r} <button onClick={() => removeRegion(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 14 }}>×</button>
                            </span>
                        ))}
                    </div>
                    <button onClick={addRegion} className="btn-secondary" style={{ fontSize: 13 }}>+ Add Region</button>
                </div>

                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Shipping Methods</h3>
                    {form.methods.map((m, i) => (
                        <div key={i} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, background: '#fafafa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: m.type === 'free_shipping' ? '#16a34a' : m.type === 'flat_rate' ? '#2563eb' : '#9333ea', background: m.type === 'free_shipping' ? '#dcfce7' : m.type === 'flat_rate' ? '#dbeafe' : '#f3e8ff', padding: '2px 8px', borderRadius: 4 }}>
                                    {m.type.replace(/_/g, ' ')}
                                </span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                                        <input type="checkbox" checked={m.enabled} onChange={e => updateMethod(i, 'enabled', e.target.checked)} /> Enabled
                                    </label>
                                    <button onClick={() => removeMethod(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>Remove</button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Title</label>
                                    <input value={m.title} onChange={e => updateMethod(i, 'title', e.target.value)} className="form-input" />
                                </div>
                                {m.type !== 'free_shipping' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Cost ($)</label>
                                        <input type="number" step="0.01" value={m.cost} onChange={e => updateMethod(i, 'cost', parseFloat(e.target.value) || 0)} className="form-input" />
                                    </div>
                                )}
                                {m.type === 'free_shipping' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Free above ($)</label>
                                        <input type="number" step="0.01" value={m.freeAbove || ''} onChange={e => updateMethod(i, 'freeAbove', parseFloat(e.target.value) || null)} className="form-input" placeholder="Leave empty = always free" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => addMethod('flat_rate')} className="btn-secondary" style={{ fontSize: 13 }}>+ Flat Rate</button>
                        <button onClick={() => addMethod('free_shipping')} className="btn-secondary" style={{ fontSize: 13 }}>+ Free Shipping</button>
                        <button onClick={() => addMethod('local_pickup')} className="btn-secondary" style={{ fontSize: 13 }}>+ Local Pickup</button>
                    </div>
                </div>

                <button onClick={handleSave} className="btn-primary">Save Zone</button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>Shipping Zones</h2>
                <button onClick={startNew} className="btn-primary">+ Add Zone</button>
            </div>

            {loading ? <p>Loading...</p> : zones.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>🚚</p>
                    <p>No shipping zones configured yet.</p>
                    <button onClick={startNew} className="btn-primary" style={{ marginTop: 16 }}>Create First Zone</button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {zones.map(zone => (
                        <div key={zone.id} className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ marginBottom: 4 }}>{zone.name}</h3>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                        {(zone.regions || []).map((r, i) => (
                                            <span key={i} style={{ padding: '2px 8px', background: '#e3f2fd', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{r}</span>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 13, color: '#666' }}>
                                        {(zone.methods || []).filter(m => m.enabled).length} method(s)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => startEdit(zone)} className="btn-secondary" style={{ fontSize: 13 }}>Edit</button>
                                    <button onClick={() => handleDelete(zone.id)} className="btn-secondary" style={{ fontSize: 13, color: '#ef4444' }}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── TAX PAGE ──────────────────────────────────────────
function TaxPage({ store }) {
    const [taxRates, setTaxRates] = useState([]);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadRates = useCallback(async () => {
        try {
            const d = await api('/admin/tax');
            setTaxRates(d.taxRates || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);
    useEffect(() => { loadRates(); }, [loadRates]);

    const defaultRate = { name: '', rate: 0, country: '', state: '*', postcode: '*', city: '*', taxClass: 'standard', priority: 1, compound: false, shipping: true };
    const [form, setForm] = useState({ ...defaultRate });

    const startEdit = (rate) => {
        setForm({ name: rate.name, rate: parseFloat(rate.rate), country: rate.country, state: rate.state, postcode: rate.postcode, city: rate.city, taxClass: rate.taxClass, priority: rate.priority, compound: rate.compound, shipping: rate.shipping });
        setEditing(rate);
    };
    const startNew = () => { setForm({ ...defaultRate }); setEditing('new'); };
    const cancelEdit = () => { setEditing(null); setForm({ ...defaultRate }); };

    const handleSave = async () => {
        try {
            if (editing === 'new') {
                await api('/admin/tax', { method: 'POST', body: JSON.stringify(form) });
            } else {
                await api(`/admin/tax/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
            }
            cancelEdit();
            loadRates();
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this tax rate?')) return;
        try {
            await api(`/admin/tax/${id}`, { method: 'DELETE' });
            loadRates();
        } catch (e) { alert(e.message); }
    };

    if (editing !== null) {
        return (
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <button onClick={cancelEdit} className="btn-secondary">← Back</button>
                    <h2>{editing === 'new' ? 'New Tax Rate' : 'Edit Tax Rate'}</h2>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. US Sales Tax" className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Rate (%) *</label>
                            <input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Country Code *</label>
                            <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value.toUpperCase() })} placeholder="US" className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>State</label>
                            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="* = all states" className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Postcode</label>
                            <input value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })} placeholder="* = all" className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>City</label>
                            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="* = all" className="form-input" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Tax Class</label>
                            <select value={form.taxClass} onChange={e => setForm({ ...form, taxClass: e.target.value })} className="form-input">
                                <option value="standard">Standard</option>
                                <option value="reduced">Reduced Rate</option>
                                <option value="zero">Zero Rate</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Priority</label>
                            <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} className="form-input" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                            <input type="checkbox" checked={form.compound} onChange={e => setForm({ ...form, compound: e.target.checked })} />
                            Compound (apply on top of other taxes)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                            <input type="checkbox" checked={form.shipping} onChange={e => setForm({ ...form, shipping: e.target.checked })} />
                            Apply to shipping
                        </label>
                    </div>

                    <button onClick={handleSave} className="btn-primary" style={{ marginTop: 20 }}>Save Tax Rate</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>Tax Rates</h2>
                <button onClick={startNew} className="btn-primary">+ Add Rate</button>
            </div>

            {loading ? <p>Loading...</p> : taxRates.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>🧾</p>
                    <p>No tax rates configured yet.</p>
                    <p style={{ fontSize: 13, marginTop: 4, color: '#aaa' }}>Enable tax in Settings first, then add rates here.</p>
                    <button onClick={startNew} className="btn-primary" style={{ marginTop: 16 }}>Create First Rate</button>
                </div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Rate</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Country</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>State</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Class</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taxRates.map(rate => (
                                <tr key={rate.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{rate.name}</td>
                                    <td style={{ padding: '12px 16px' }}>{parseFloat(rate.rate).toFixed(2)}%</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '2px 8px', background: '#e3f2fd', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{rate.country}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: rate.state === '*' ? '#999' : '#111' }}>{rate.state}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 12 }}>{rate.taxClass}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button onClick={() => startEdit(rate)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: 12, fontSize: 13 }}>Edit</button>
                                        <button onClick={() => handleDelete(rate.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── PAYMENT PAGE ──────────────────────────────────────
function PaymentPage({ store }) {
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const loadGateways = useCallback(async () => {
        try {
            const data = await api('/admin/payments');
            setGateways(data.gateways || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { loadGateways(); }, [loadGateways]);

    const handleToggle = async (gateway, active) => {
        setSaving(true);
        try {
            await api(`/admin/payments/${gateway.provider}`, {
                method: 'PUT',
                body: JSON.stringify({ ...gateway, isActive: active })
            });
            setMsg(`${gateway.name} ${active ? 'enabled' : 'disabled'}`);
            loadGateways();
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const handleSaveConfig = async (gateway, newConfig) => {
        setSaving(true);
        try {
            await api(`/admin/payments/${gateway.provider}`, {
                method: 'PUT',
                body: JSON.stringify({ ...gateway, config: newConfig })
            });
            setMsg(`Configuration saved for ${gateway.name}`);
            loadGateways();
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    if (loading) return <div className="page"><p>Loading payment gateways...</p></div>;

    return (
        <div className="page">
            <div className="page-header">
                <div><h1>Payment Methods</h1><p>Manage how customers pay you</p></div>
            </div>

            {msg && <div className="alert alert-success">{msg}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                {gateways.map(g => (
                    <GatewayCard 
                        key={g.id} 
                        gateway={g} 
                        onToggle={(active) => handleToggle(g, active)}
                        onSave={(cfg) => handleSaveConfig(g, cfg)}
                        disabled={saving}
                    />
                ))}
            </div>

            <div className="card" style={{ marginTop: 24, padding: 20, background: '#f8fafc' }}>
                <h3>Integration Guide</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                    Active gateways will automatically appear on your checkout page. 
                    Make sure you have correctly configured the credentials for each provider.
                </p>
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <span className="badge badge-info">Stripe: Global Cards</span>
                    <span className="badge badge-info">JazzCash/EasyPaisa: Pakistan Wallets</span>
                </div>
            </div>
        </div>
    );
}

function GatewayCard({ gateway, onToggle, onSave, disabled }) {
    const [expanded, setExpanded] = useState(false);
    const [config, setConfig] = useState(gateway.config || {});

    const providerIcons = {
        stripe: '💳',
        jazzcash: '📱',
        easypaisa: '💰',
        cod: '📦'
    };

    return (
        <div className={`card gateway-card ${gateway.isActive ? 'active' : ''}`} style={{ borderLeft: gateway.isActive ? '4px solid #16a34a' : '4px solid #e5e7eb' }}>
            <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ fontSize: 32 }}>{providerIcons[gateway.provider] || '💰'}</div>
                        <div>
                            <h3 style={{ margin: 0 }}>{gateway.name}</h3>
                            <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>{gateway.description}</p>
                        </div>
                    </div>
                    <div className="switch-container">
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={gateway.isActive} 
                                onChange={(e) => onToggle(e.target.checked)} 
                                disabled={disabled}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${gateway.isActive ? 'badge-completed' : 'badge-pending'}`}>
                        {gateway.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                        className="btn-secondary" 
                        style={{ fontSize: 12 }} 
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? 'Hide Setup' : 'Manage Setup'}
                    </button>
                </div>

                {expanded && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                        <h4>Configuration</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                            {gateway.provider === 'stripe' && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                                        <div>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>Test Mode</span>
                                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Use Stripe test credentials</p>
                                        </div>
                                        <label className="switch" style={{ scale: '0.8' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={config.testMode || false} 
                                                onChange={e => setConfig({ ...config, testMode: e.target.checked })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 500 }}>{config.testMode ? 'Test' : 'Live'} Publishable Key</label>
                                        {config.testMode ? (
                                            <input 
                                                className="form-input" 
                                                value={config.testPublicKey || ''} 
                                                onChange={e => setConfig({ ...config, testPublicKey: e.target.value })}
                                                placeholder="pk_test_..."
                                            />
                                        ) : (
                                            <input 
                                                className="form-input" 
                                                value={config.publicKey || ''} 
                                                onChange={e => setConfig({ ...config, publicKey: e.target.value })}
                                                placeholder="pk_live_..."
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 500 }}>{config.testMode ? 'Test' : 'Live'} Secret Key</label>
                                        {config.testMode ? (
                                            <input 
                                                type="password"
                                                className="form-input" 
                                                value={config.testSecretKey || ''} 
                                                onChange={e => setConfig({ ...config, testSecretKey: e.target.value })}
                                                placeholder="sk_test_..."
                                            />
                                        ) : (
                                            <input 
                                                type="password"
                                                className="form-input" 
                                                value={config.secretKey || ''} 
                                                onChange={e => setConfig({ ...config, secretKey: e.target.value })}
                                                placeholder="sk_live_..."
                                            />
                                        )}
                                    </div>
                                    {!config.testMode && (
                                        <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>
                                            ⚠️ Warning: Live mode will process real transactions.
                                        </div>
                                    )}
                                </>
                            )}
                            {(gateway.provider === 'jazzcash' || gateway.provider === 'easypaisa') && (
                                <>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 500 }}>Merchant ID</label>
                                        <input 
                                            className="form-input" 
                                            value={config.merchantId || ''} 
                                            onChange={e => setConfig({ ...config, merchantId: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, fontWeight: 500 }}>API Password / Hash Key</label>
                                        <input 
                                            type="password"
                                            className="form-input" 
                                            value={config.apiKey || ''} 
                                            onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}
                            {gateway.provider === 'cod' && (
                                <p style={{ fontSize: 13, color: '#666' }}>No additional configuration required for Cash on Delivery.</p>
                            )}
                            <button 
                                className="btn-primary" 
                                onClick={() => onSave(config)}
                                disabled={disabled}
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// --- SETTINGS PAGE ---
function SettingsPage({ store, setStore }) {
    const [form, setForm] = useState({ name: store?.name || '', defaultCurrency: store?.defaultCurrency || 'USD', stripeSecretKey: store?.stripeSecretKey || '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const handleSave = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const data = await api('/admin/store/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            setStore(prev => ({ ...prev, ...data.store }));
            setMsg('Settings saved!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) { setMsg('Error: ' + err.message); }
        setSaving(false);
    };

    const apiKey = store?.apiKeys?.[0]?.publicKey || 'N/A';

    return (
        <div className="page">
            <div className="page-header"><h1>Settings</h1><p>Store configuration</p></div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="grid-2">
                <div className="card">
                    <h3>Store Settings</h3>
                    <form onSubmit={handleSave}>
                        <div className="field-row"><label>Store Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div className="field-row"><label>Currency</label>
                            <select value={form.defaultCurrency} onChange={e => setForm({ ...form, defaultCurrency: e.target.value })}>
                                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="PKR">PKR (₨)</option>
                            </select>
                        </div>
                        <div className="field-row"><label>Stripe Secret Key</label><input type="password" value={form.stripeSecretKey} onChange={e => setForm({ ...form, stripeSecretKey: e.target.value })} placeholder="sk_test_..." /></div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
                    </form>
                </div>
                <div className="card">
                    <h3>API Keys</h3>
                    <div className="field-row"><label>Public Key (for engine.js)</label><code className="code-block">{apiKey}</code></div>
                    <div className="field-row"><label>Script Tag</label><pre className="code-block">{`<script src="/engine.js"\n  data-store-key="${apiKey}">\n</script>`}</pre></div>
                </div>
            </div>
        </div>
    );
}