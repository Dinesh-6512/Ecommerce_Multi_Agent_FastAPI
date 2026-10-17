import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../api';

function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('featured');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchApi('/categories').then(data => setCategories(data)).catch(console.error);
    fetchProducts();
  }, []);

  const fetchProducts = (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    fetchApi(`/products${query}`).then(data => setProducts(data)).catch(console.error);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const filteredProducts = products.filter(p => {
    if (categoryFilter === 'All') return true;
    const categoryName = categories.find(c => c.id === p.category_id)?.name;
    return categoryName === categoryFilter;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === 'price-low') return a.price - b.price;
    if (sortOrder === 'price-high') return b.price - a.price;
    return 0;
  });

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';

  return (
    <div>
      <h1 className="page-title">Discover Products</h1>
      
      <div className="filters-bar">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search products..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        
        <select 
          className="filter-select" 
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        
        <select 
          className="filter-select"
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
        >
          <option value="featured">Featured</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="product-grid">
        {sortedProducts.map(product => (
          <Link to={`/product/${product.id}`} key={product.id} className="product-card">
            <div className="product-image" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b'}}>
              No Image
            </div>
            <div className="product-info">
              <span className="product-category">{getCategoryName(product.category_id)}</span>
              <h3 className="product-title">{product.name}</h3>
              <p className="product-price">${product.price.toFixed(2)}</p>
              <button className="btn btn-primary" style={{marginTop: 'auto'}}>View Details</button>
            </div>
          </Link>
        ))}
        {sortedProducts.length === 0 && (
          <p style={{color: 'var(--text-secondary)'}}>No products found.</p>
        )}
      </div>
    </div>
  );
}

export default Home;
