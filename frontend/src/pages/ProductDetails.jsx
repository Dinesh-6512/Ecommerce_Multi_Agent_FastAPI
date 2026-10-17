import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApi('/categories').then(data => setCategories(data)).catch(console.error);
    fetchApi(`/products/${id}`)
      .then(data => setProduct(data))
      .catch(err => setError('Product not found'));
  }, [id]);

  const handleAddToCart = async () => {
    try {
      await fetchApi('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: product.id, quantity })
      });
      navigate('/cart');
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('authenticated')) {
        navigate('/login');
      } else {
        alert(err.message);
      }
    }
  };

  if (error) return <div style={{padding: '2rem'}}>{error}</div>;
  if (!product) return <div style={{padding: '2rem'}}>Loading...</div>;

  const isOutOfStock = product.stock <= 0;
  const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Unknown';

  return (
    <div>
      <Link to="/" style={{display: 'inline-block', marginBottom: '2rem', color: 'var(--text-secondary)'}}>
        &larr; Back to Shop
      </Link>
      
      <div className="details-container">
        <div className="details-image" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', color: '#64748b'}}>
          No Image
        </div>
        
        <div className="details-info">
          <span className="product-category">{categoryName}</span>
          <h1 className="page-title" style={{marginBottom: '0.5rem'}}>{product.name}</h1>
          <p className="product-price" style={{fontSize: '2rem'}}>${product.price.toFixed(2)}</p>
          
          <div className={`stock-badge ${isOutOfStock ? 'stock-out' : 'stock-in'}`}>
            {isOutOfStock ? 'Out of Stock' : `In Stock: ${product.stock} available`}
          </div>
          
          <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap'}}>
            {product.description}
          </p>
          
          <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
            <div className="form-group" style={{marginBottom: 0, width: '100px'}}>
              <label htmlFor="quantity">Quantity</label>
              <input 
                type="number" 
                id="quantity" 
                value={quantity} 
                min="1" 
                max={product.stock > 0 ? product.stock : 1}
                onChange={e => setQuantity(Number(e.target.value))}
                disabled={isOutOfStock}
              />
            </div>
            
            <button className="btn btn-primary" style={{flex: 1}} disabled={isOutOfStock} onClick={handleAddToCart}>
              {isOutOfStock ? 'Currently Unavailable' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
