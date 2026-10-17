import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const data = await fetchApi('/admin/orders');
      setOrders(data);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        navigate('/login');
      } else {
        setError(err.message);
      }
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetchApi(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders(); // refresh
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;

  return (
    <div>
      <h1 className="page-title">Order Management</h1>
      
      <div className="card" style={{overflowX: 'auto'}}>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '1rem'}}>Order ID</th>
              <th style={{padding: '1rem'}}>Customer ID</th>
              <th style={{padding: '1rem'}}>Address</th>
              <th style={{padding: '1rem'}}>Total</th>
              <th style={{padding: '1rem'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                <td style={{padding: '1rem', fontWeight: 'bold'}}>#{order.id}</td>
                <td style={{padding: '1rem'}}>{order.user_id}</td>
                <td style={{padding: '1rem', color: 'var(--text-secondary)'}}>{order.delivery_address}</td>
                <td style={{padding: '1rem'}}>${order.total_price.toFixed(2)}</td>
                <td style={{padding: '1rem'}}>
                  <select 
                    className="filter-select" 
                    value={order.status} 
                    onChange={e => updateStatus(order.id, e.target.value)}
                    style={{padding: '0.25rem 0.5rem', fontSize: '0.875rem'}}
                  >
                    <option value="Placed">Placed</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan="5" style={{padding: '1rem'}}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <Link to="/admin" style={{display: 'block', marginTop: '1.5rem', color: 'var(--text-secondary)'}}>
        &larr; Back to Dashboard
      </Link>
    </div>
  );
}

export default AdminOrders;
