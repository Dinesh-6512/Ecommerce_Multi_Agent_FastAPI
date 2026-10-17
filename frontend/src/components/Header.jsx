import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <Link to="/" className="logo">LuminaCart</Link>
      <nav className="nav-links">
        <Link to="/">Shop</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/admin" style={{color: 'var(--text-secondary)'}}>Admin</Link>
      </nav>
    </header>
  );
}

export default Header;
