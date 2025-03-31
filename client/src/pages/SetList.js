import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSets, deleteSet } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const SetList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const data = await getSets();
        setSets(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch sets. Please try again later.');
        setLoading(false);
      }
    };

    fetchSets();
  }, []);

  const handleEdit = (id) => {
    navigate(`/sets/edit/${id}`);
  };

  const handleView = (id) => {
    navigate(`/sets/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this set? This action cannot be undone.')) {
      try {
        await deleteSet(id);
        setSets(sets.filter(set => set._id !== id));
      } catch (err) {
        setError('Failed to delete set. Please try again later.');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading sets...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="set-list-page">
      <div className="header">
        <h1>Card Sets</h1>
        {isAdmin && (
          <Link to="/sets/create" className="btn">Create New Set</Link>
        )}
      </div>

      {sets.length === 0 ? (
        <div className="no-sets">
          <p>No sets found.</p>
        </div>
      ) : (
        <div className="set-list">
          {sets.map(set => (
            <div key={set._id} className={`set-item ${set.hidden ? 'hidden-set' : ''}`}>
              <div className="set-info">
                <h3 className="set-name">
                  <Link to={`/sets/${set._id}`}>{set.name}</Link>
                  {set.hidden && isAdmin && (
                    <span className="hidden-set-badge" title="This set is hidden from non-admin users">Hidden</span>
                  )}
                </h3>
                <p className="set-description">{set.description || 'No description available.'}</p>
                <div className="set-meta">
                  <span className="set-card-count">
                    {set.cards?.length || 0} card{(set.cards?.length !== 1) ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {isAdmin && (
                <div className="set-actions">
                  <Link to={`/sets/edit/${set._id}`} className="btn btn-edit">Edit</Link>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(set._id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetList; 