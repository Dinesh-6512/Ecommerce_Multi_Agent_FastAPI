import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApi('/profile')
      .then(data => setUser(data))
      .catch(err => {
        setError(err.message);
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user) return <div style={{textAlign: 'center', padding: '2rem'}}>Loading...</div>;

  return (
    <div>
      <h1 className="page-title">My Profile</h1>
      <div className="card" style={{marginBottom: '2rem'}}>
        <h3>User Details</h3>
        {error && <div style={{color: 'var(--error-color)'}}>{error}</div>}
        <p style={{color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Name: {user.name}</p>
        <p style={{color: 'var(--text-secondary)'}}>Email: {user.email}</p>
        {user.is_admin && <p style={{color: 'var(--primary-color)', fontWeight: 'bold'}}>Admin User</p>}
        <button className="btn btn-primary" onClick={handleLogout} style={{marginTop: '1rem'}}>Logout</button>
      </div>
      
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3>Order History</h3>
          <Link to="/order-history" className="btn" style={{border: '1px solid var(--border-color)'}}>View All Orders</Link>
        </div>
      </div>
    </div>
  );
}

export default Profile;
