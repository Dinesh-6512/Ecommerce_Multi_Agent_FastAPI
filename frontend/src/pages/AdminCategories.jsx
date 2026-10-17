import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api';

function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: '' });

  useEffect(() => {
    fetchCategories();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const data = await fetchApi('/categories');
      setCategories(data);
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('403')) {
        navigate('/login');
      } else {
        setError(err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await fetchApi(`/admin/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setIsEditing(true);
      setCurrentCategory(category);
    } else {
      setIsEditing(false);
      setCurrentCategory({ id: null, name: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await fetchApi(`/admin/categories/${currentCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: currentCategory.name })
        });
      } else {
        await fetchApi('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ name: currentCategory.name })
        });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div style={{padding: '2rem', color: 'var(--error-color)'}}>{error}</div>;

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <h1 className="page-title" style={{marginBottom: 0}}>Category Management</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Add Category</button>
      </div>
      
      <div className="card" style={{maxWidth: '600px'}}>
        <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '1px solid var(--border-color)'}}>
              <th style={{padding: '1rem'}}>ID</th>
              <th style={{padding: '1rem'}}>Category Name</th>
              <th style={{padding: '1rem', textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                <td style={{padding: '1rem'}}>{category.id}</td>
                <td style={{padding: '1rem', fontWeight: 'bold'}}>{category.name}</td>
                <td style={{padding: '1rem', textAlign: 'right'}}>
                  <button className="btn" onClick={() => handleOpenModal(category)} style={{padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginRight: '0.5rem', border: '1px solid var(--border-color)'}}>Edit</button>
                  <button className="btn" onClick={() => handleDelete(category.id)} style={{padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--error-color)', border: '1px solid var(--error-color)'}}>Delete</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan="3" style={{padding: '1rem'}}>No categories found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isModalOpen && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="card" style={{width: '400px', backgroundColor: 'var(--bg-color)'}}>
            <h2>{isEditing ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Name</label>
                <input required type="text" className="form-control" value={currentCategory.name} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} />
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Link to="/admin" style={{display: 'block', marginTop: '1.5rem', color: 'var(--text-secondary)'}}>
        &larr; Back to Dashboard
      </Link>
    </div>
  );
}

export default AdminCategories;
