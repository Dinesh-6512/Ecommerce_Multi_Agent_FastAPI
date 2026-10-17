import { Link, useLocation } from 'react-router-dom';

function OrderConfirmation() {
  const location = useLocation();
  const orderId = location.state?.orderId || 'Unknown';

  return (
    <div className="auth-container" style={{textAlign: 'center'}}>
      <div className="card">
        <div style={{fontSize: '4rem', color: 'var(--success-color)', marginBottom: '1rem'}}>✓</div>
        <h1 className="page-title" style={{marginBottom: '0.5rem'}}>Order Placed!</h1>
        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>
          Thank you for your purchase. Your order number is <strong>#ORD-{orderId}</strong>.
        </p>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
          <Link to="/" className="btn" style={{backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)'}}>Continue Shopping</Link>
          <Link to="/order-history" className="btn btn-primary">View Orders</Link>
        </div>
      </div>
    </div>
  );
}

export default OrderConfirmation;
