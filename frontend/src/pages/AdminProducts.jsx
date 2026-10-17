import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    id: null, name: '', description: '', price: 0, stock: 0, category_id: ''
  });

  useEffect(() => {
    fetchApi('/categories').then(data => setCategories(data)).catch(console.error);
    fetchProducts();
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      const data = await fetchApi('/products');
      setProducts(data);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        navigate('/login');
      } else {
        setError(err.message);
      }
    }
  };

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetchApi(`/admin/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setIsEditing(true);
      setCurrentProduct(product);
    } else {
      setIsEditing(false);
      setCurrentProduct({ id: null, name: '', description: '', price: 0, stock: 0, category_id: categories.length > 0 ? categories[0].id : '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: currentProduct.name,
        description: currentProduct.description,
        price: parseFloat(currentProduct.price),
        stock: parseInt(currentProduct.stock),
        category_id: parseInt(currentProduct.category_id)
      };

      if (isEditing) {
        await fetchApi(`/admin/products/${currentProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1 className="page-title" style={{marginBottom: 0}}>Product Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Add Product</button>
      </div>
      
      <div className="card" style={{overflowX: 'auto'}}>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '1rem'}}>ID</th>
              <th style={{padding: '1rem'}}>Name</th>
              <th style={{padding: '1rem'}}>Category</th>
              <th style={{padding: '1rem'}}>Price</th>
              <th style={{padding: '1rem'}}>Stock</th>
              <th style={{padding: '1rem'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                <td style={{padding: '1rem'}}>{product.id}</td>
                <td style={{padding: '1rem', fontWeight: 'bold'}}>{product.name}</td>
                <td style={{padding: '1rem', color: 'var(--text-secondary)'}}>{getCategoryName(product.category_id)}</td>
                <td style={{padding: '1rem'}}>${product.price.toFixed(2)}</td>
                <td style={{padding: '1rem'}}>
                  <span style={{color: product.stock > 0 ? 'var(--success-color)' : 'var(--error-color)'}}>
                    {product.stock}
                  </span>
                </td>
                <td style={{padding: '1rem'}}>
                  <button className="btn" onClick={() => handleOpenModal(product)} style={{padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginRight: '0.5rem', border: '1px solid var(--border-color)'}}>Edit</button>
                  <button className="btn" onClick={() => handleDelete(product.id)} style={{padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error-color)', border: '1px solid var(--error-color)'}}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="6" style={{padding: '1rem'}}>No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isModalOpen && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="card" style={{width: '500px', backgroundColor: 'var(--bg-color)', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>{isEditing ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Name</label>
                <input required type="text" className="form-control" value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required className="form-control" value={currentProduct.description} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} rows="3"></textarea>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <div className="form-group" style={{flex: 1}}>
                  <label>Price ($)</label>
                  <input required type="number" step="0.01" min="0" className="form-control" value={currentProduct.price} onChange={e => setCurrentProduct({...currentProduct, price: e.target.value})} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                  <label>Stock</label>
                  <input required type="number" min="0" className="form-control" value={currentProduct.stock} onChange={e => setCurrentProduct({...currentProduct, stock: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select required className="form-control" value={currentProduct.category_id} onChange={e => setCurrentProduct({...currentProduct, category_id: e.target.value})}>
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Link to="/admin" style={{display: 'block', marginTop: '1.5rem', color: 'var(--text-secondary)'}}>
        &larr; Back to Dashboard
      </Link>
    </div>
  );
}

export default AdminProducts;
