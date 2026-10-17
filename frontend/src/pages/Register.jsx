import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchApi('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="page-title" style={{textAlign: 'center'}}>Register</h1>
      <div className="card">
        {error && <div style={{color: 'var(--error-color)', marginBottom: '1rem'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Register</button>
        </form>
        <p style={{marginTop: '1.5rem', textAlign: 'center'}}>
          Already have an account? <Link to="/login" style={{color: 'var(--primary-color)'}}>Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
