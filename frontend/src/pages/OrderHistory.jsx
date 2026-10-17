import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApi('/orders')
      .then(data => setOrders(data))
      .catch(err => {
        if (err.message.includes('401') || err.message.includes('authenticated')) {
          navigate('/login');
        } else {
          setError(err.message);
        }
      });
  }, [navigate]);

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;

  return (
    <div>
      <h1 className="page-title">Order History</h1>
      
      <div className="card">
        {orders.length === 0 ? (
          <p>You have no past orders.</p>
        ) : (
          orders.map(order => (
            <div key={order.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border-color)'}}>
              <div>
                <h3 style={{marginBottom: '0.25rem'}}>#ORD-{order.id}</h3>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Address: {order.delivery_address}</p>
              </div>
              <div style={{textAlign: 'right'}}>
                <p style={{fontWeight: 'bold', color: 'var(--primary-color)'}}>${order.total_price.toFixed(2)}</p>
                <span className={`stock-badge ${order.status === 'Delivered' ? 'stock-in' : ''}`} style={{marginBottom: 0, marginTop: '0.5rem', backgroundColor: order.status === 'Placed' || order.status === 'Processing' ? 'rgba(59, 130, 246, 0.2)' : undefined, color: order.status === 'Placed' || order.status === 'Processing' ? 'var(--primary-color)' : undefined}}>
                  {order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      <Link to="/profile" style={{display: 'block', marginTop: '1.5rem', color: 'var(--text-secondary)'}}>
        &larr; Back to Profile
      </Link>
    </div>
  );
}

export default OrderHistory;
