import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function Checkout() {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApi('/cart')
      .then(data => setCart(data))
      .catch(err => {
        if (err.message.includes('401') || err.message.includes('authenticated')) {
          navigate('/login');
        } else {
          setError(err.message);
        }
      });
  }, [navigate]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const order = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({ delivery_address: address })
      });
      navigate('/order-confirmation', { state: { orderId: order.id } });
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;
  if (!cart) return <div style={{padding: '2rem'}}>Loading...</div>;

  return (
    <div className="auth-container" style={{maxWidth: '600px'}}>
      <h1 className="page-title">Checkout</h1>
      <div className="card">
        <h3 style={{marginBottom: '1.5rem'}}>Delivery Information</h3>
        <form onSubmit={handlePlaceOrder}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" placeholder="John Doe" required />
          </div>
          <div className="form-group">
            <label htmlFor="address">Delivery Address</label>
            <input type="text" id="address" placeholder="123 Main St, City, Country" value={address} onChange={e => setAddress(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="card">Credit Card Number</label>
            <input type="text" id="card" placeholder="XXXX-XXXX-XXXX-XXXX" required />
          </div>
          
          <div style={{backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
              <span>Order Total:</span>
              <span style={{color: 'var(--primary-color)'}}>${cart.total.toFixed(2)}</span>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={!cart.items || cart.items.length === 0}>Place Order</button>
        </form>
      </div>
      <Link to="/cart" style={{display: 'block', marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
        &larr; Back to Cart
      </Link>
    </div>
  );
}

export default Checkout;
