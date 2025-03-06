import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSets, deleteSet } from '../services/api';

const SetList = () => {
  const navigate = useNavigate();
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
    if (window.confirm('Are you sure you want to delete this set?')) {
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
        <Link to="/sets/create" className="btn">Create New Set</Link>
      </div>

      {sets.length === 0 ? (
        <div className="no-sets">
          <p>No sets found. Create your first set!</p>
        </div>
      ) : (
        <div className="set-list">
          {sets.map(set => (
            <div className="set-item" key={set._id}>
              <div className="set-info">
                <h3 className="set-name">{set.name}</h3>
                {set.description && (
                  <p className="set-description">{set.description}</p>
                )}
                <div className="set-meta">
                  <span className="set-card-count">
                    {set.cards.length} {set.cards.length === 1 ? 'card' : 'cards'}
                  </span>
                </div>
              </div>
              <div className="set-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleView(set._id)}
                >
                  View
                </button>
                <button 
                  className="btn btn-edit"
                  onClick={() => handleEdit(set._id)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDelete(set._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetList; 