import { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000/api/products";

/* ─── tiny helpers ──────────────────────────────────────────────────── */
function useDebounce(value, delay = 350) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest" },
  { value: "price_asc",  label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "rating",     label: "Top Rated" },
];

const STAR = (rating) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
};

/* ─── sub-components ────────────────────────────────────────────────── */
function ProductCard({ product }) {
  const inStock = product.stock > 0;
  return (
    <article className="card">
      <div className="card-image">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" />
          : <span className="card-placeholder">{product.name[0]}</span>}
        {!inStock && <span className="badge out">Out of Stock</span>}
        {inStock && product.stock < 10 && (
          <span className="badge low">Only {product.stock} left</span>
        )}
      </div>
      <div className="card-body">
        <span className="card-cat">{product.category?.name}</span>
        <h3 className="card-name">{product.name}</h3>
        <p  className="card-desc">{product.description}</p>
        <div className="card-footer">
          <span className="card-price">${Number(product.price).toFixed(2)}</span>
          <span className="card-rating" title={`${product.rating} / 5`}>
            {STAR(product.rating)} <em>{product.rating}</em>
          </span>
        </div>
        <button className={`btn-add ${!inStock ? "disabled" : ""}`} disabled={!inStock}>
          {inStock ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <article className="card skeleton">
      <div className="sk-img" />
      <div className="card-body">
        <div className="sk-line short" />
        <div className="sk-line" />
        <div className="sk-line medium" />
        <div className="sk-line short" style={{ marginTop: "auto" }} />
      </div>
    </article>
  );
}

/* ─── main app ──────────────────────────────────────────────────────── */
export default function App() {
  const [query,      setQuery]      = useState("");
  const [category,   setCategory]   = useState("");
  const [minPrice,   setMinPrice]   = useState("");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [sort,       setSort]       = useState("newest");
  const [page,       setPage]       = useState(1);

  const [products,   setProducts]   = useState([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [categories, setCategories] = useState([]);

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [firstLoad,  setFirstLoad]  = useState(true);

  const debouncedQuery = useDebounce(query, 350);
  const inputRef       = useRef(null);
  const resultRef      = useRef(null);

  /* fetch categories once */
  useEffect(() => {
    fetch(`${API_BASE}/categories/`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  /* fetch products */
  const fetchProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, page: pg, limit: 12 });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (category)       params.set("category", category);
      if (minPrice)       params.set("min_price", minPrice);
      if (maxPrice)       params.set("max_price", maxPrice);

      const res  = await fetch(`${API_BASE}/search/?${params}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      setProducts(data.results);
      setTotal(data.total);
      setPages(data.pages);
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [debouncedQuery, category, minPrice, maxPrice, sort]);

  /* re-fetch when search params change */
  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  /* scroll to results on page change */
  const goToPage = (pg) => {
    fetchProducts(pg);
    resultRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const clearAll = () => {
    setQuery(""); setCategory(""); setMinPrice(""); setMaxPrice(""); setSort("newest");
    inputRef.current?.focus();
  };

  const hasFilters = query || category || minPrice || maxPrice || sort !== "newest";

  return (
    <div className="app">
      {/* ── Hero / Search Bar ── */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-label">PRODUCT SEARCH</div>
          <h1 className="hero-title">Find What You<br /><span>Actually</span> Need</h1>

          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")} title="Clear">✕</button>
            )}
          </div>

          {/* ── Filters Row ── */}
          <div className="filters-row">
            <select className="filter-select" value={category}
              onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="price-range">
              <input type="number" className="filter-input" placeholder="Min $"
                value={minPrice} onChange={e => setMinPrice(e.target.value)} min="0" />
              <span>–</span>
              <input type="number" className="filter-input" placeholder="Max $"
                value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min="0" />
            </div>

            <select className="filter-select" value={sort}
              onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {hasFilters && (
              <button className="clear-all-btn" onClick={clearAll}>Clear all</button>
            )}
          </div>
        </div>
      </header>

      {/* ── Results ── */}
      <main className="main" ref={resultRef}>
        <div className="results-header">
          {!firstLoad && !loading && (
            <p className="results-count">
              {total === 0
                ? "No products found"
                : `${total} product${total !== 1 ? "s" : ""} found`}
              {debouncedQuery && <> for <strong>"{debouncedQuery}"</strong></>}
            </p>
          )}
          {loading && <p className="results-count pulse">Searching…</p>}
        </div>

        {error && (
          <div className="error-box">
            <strong>⚠ Connection error</strong>
            <p>{error}</p>
            <p>Make sure the Django server is running on <code>http://127.0.0.1:8000</code></p>
          </div>
        )}

        <div className="grid">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)
            : products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        {!loading && products.length === 0 && !error && !firstLoad && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>Nothing matches your search</h2>
            <p>Try different keywords or remove some filters.</p>
            <button className="clear-all-btn" onClick={clearAll}>Reset filters</button>
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && !loading && (
          <nav className="pagination">
            <button className="pg-btn" disabled={page === 1}
              onClick={() => goToPage(page - 1)}>← Prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1)
                  acc.push(<span key={`gap-${p}`} className="pg-gap">…</span>);
                acc.push(
                  <button key={p} className={`pg-btn ${p === page ? "active" : ""}`}
                    onClick={() => goToPage(p)}>{p}</button>
                );
                return acc;
              }, [])}
            <button className="pg-btn" disabled={page === pages}
              onClick={() => goToPage(page + 1)}>Next →</button>
          </nav>
        )}
      </main>

      <footer className="footer">
        <p>Product Search System · Built with Django + React</p>
      </footer>
    </div>
  );
}
