import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await fetchApi('/login', {
        method: 'POST',
        body: params
      });
      localStorage.setItem('token', response.access_token);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="page-title" style={{textAlign: 'center'}}>Login</h1>
      <div className="card">
        {error && <div style={{color: 'var(--error-color)', marginBottom: '1rem'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Login</button>
        </form>
        <p style={{marginTop: '1.5rem', textAlign: 'center'}}>
          Don't have an account? <Link to="/register" style={{color: 'var(--primary-color)'}}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
