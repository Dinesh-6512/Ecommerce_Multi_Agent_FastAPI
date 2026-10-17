import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const data = await fetchApi('/cart');
      setCart(data);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('authenticated')) {
        navigate('/login');
      } else {
        setError(err.message);
      }
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      const data = await fetchApi(`/cart/items/${itemId}?quantity=${newQuantity}`, {
        method: 'PUT'
      });
      setCart(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const data = await fetchApi(`/cart/items/${itemId}`, {
        method: 'DELETE'
      });
      setCart(data);
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;
  if (!cart) return <div style={{padding: '2rem'}}>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Shopping Cart</h1>
      
      {(!cart.items || cart.items.length === 0) ? (
        <div className="card">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn btn-primary" style={{marginTop: '1rem'}}>Continue Shopping</Link>
        </div>
      ) : (
        <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
          <div style={{flex: '2 1 400px'}}>
            {cart.items.map(item => (
              <div key={item.id} className="card" style={{display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center'}}>
                <div style={{width: '80px', height: '80px', backgroundColor: '#e2e8f0', borderRadius: '8px'}}></div>
                <div style={{flex: 1}}>
                  <h3 style={{fontSize: '1.1rem'}}>{item.product.name}</h3>
                  <p style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>${item.product.price.toFixed(2)}</p>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <button className="btn" style={{padding: '0.25rem 0.5rem'}} onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="btn" style={{padding: '0.25rem 0.5rem'}} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <button className="btn" style={{color: 'var(--error-color)'}} onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            ))}
          </div>
          
          <div className="card" style={{flex: '1 1 300px', height: 'fit-content'}}>
            <h3 style={{marginBottom: '1rem'}}>Order Summary</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
              <span>Subtotal</span>
              <span>${cart.total.toFixed(2)}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <hr style={{borderColor: 'var(--border-color)', margin: '1rem 0'}} />
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontWeight: 'bold', fontSize: '1.2rem'}}>
              <span>Total</span>
              <span style={{color: 'var(--primary-color)'}}>${cart.total.toFixed(2)}</span>
            </div>
            <Link to="/checkout" className="btn btn-primary btn-full" style={{textAlign: 'center'}}>Proceed to Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
