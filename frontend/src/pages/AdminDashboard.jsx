import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchApi('/products'),
      fetchApi('/categories'),
      fetchApi('/admin/orders')
    ]).then(([prod, cat, ord]) => {
      setStats({
        products: prod.length,
        categories: cat.length,
        orders: ord.length
      });
    }).catch(err => {
      if (err.message.includes('401') || err.message.includes('403')) {
        navigate('/login');
      } else {
        setError(err.message);
      }
    });
  }, [navigate]);

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'}}>
        <div className="card" style={{textAlign: 'center'}}>
          <h2 style={{fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '0.5rem'}}>{stats.products}</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Total Products</p>
          <Link to="/admin/products" className="btn btn-primary btn-full">Manage Products</Link>
        </div>
        
        <div className="card" style={{textAlign: 'center'}}>
          <h2 style={{fontSize: '3rem', color: 'var(--success-color)', marginBottom: '0.5rem'}}>{stats.categories}</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Active Categories</p>
          <Link to="/admin/categories" className="btn btn-primary btn-full">Manage Categories</Link>
        </div>
        
        <div className="card" style={{textAlign: 'center'}}>
          <h2 style={{fontSize: '3rem', color: '#f59e0b', marginBottom: '0.5rem'}}>{stats.orders}</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Total Orders</p>
          <Link to="/admin/orders" className="btn btn-primary btn-full">Manage Orders</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
