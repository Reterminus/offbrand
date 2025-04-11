import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSets, deleteSet, updateSetOrder } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const SetList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  
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

  const moveSetUp = async (setId, currentIndex) => {
    if (currentIndex === 0) return; // Already at the top
    
    setReordering(true);
    
    try {
      // Create new array to avoid mutating state directly
      const updatedSets = [...sets];
      // Swap positions in the array
      const temp = updatedSets[currentIndex];
      updatedSets[currentIndex] = updatedSets[currentIndex - 1];
      updatedSets[currentIndex - 1] = temp;
      // Update the UI immediately
      setSets(updatedSets);
    } catch (err) {
      setError('Failed to reorder sets. Please try again.');
    } finally {
      setReordering(false);
    }
  };
  
  const moveSetDown = async (setId, currentIndex) => {
    if (currentIndex === sets.length - 1) return; // Already at the bottom
    
    setReordering(true);
    
    try {
      // Create new array to avoid mutating state directly
      const updatedSets = [...sets];
      // Swap positions in the array
      const temp = updatedSets[currentIndex];
      updatedSets[currentIndex] = updatedSets[currentIndex + 1];
      updatedSets[currentIndex + 1] = temp;
      // Update the UI immediately
      setSets(updatedSets);
    } catch (err) {
      setError('Failed to reorder sets. Please try again.');
    } finally {
      setReordering(false);
    }
  };

  const moveSetToPosition = async (setId, currentIndex, newIndex) => {
    if (currentIndex === newIndex) return;
    
    setReordering(true);
    
    try {
      // Create new array to avoid mutating state directly
      const updatedSets = [...sets];
      // Remove the item from current position
      const [movedSet] = updatedSets.splice(currentIndex, 1);
      // Insert at new position
      updatedSets.splice(newIndex, 0, movedSet);
      // Update the UI immediately
      setSets(updatedSets);
    } catch (err) {
      setError('Failed to reorder sets. Please try again.');
    } finally {
      setReordering(false);
    }
  };

  const toggleReorderMode = () => {
    setIsReorderMode(!isReorderMode);
  };

  const saveNewOrder = async () => {
    setSavingOrder(true);
    try {
      // Update each set with its new order value based on array index
      const updatePromises = sets.map((set, index) => 
        updateSetOrder(set._id, index + 1)
      );
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Exit reorder mode after saving
      setIsReorderMode(false);
      
      // Refresh the sets to ensure we have the updated order
      const updatedSets = await getSets();
      setSets(updatedSets);
    } catch (err) {
      setError('Failed to save the new order. Please try again.');
    } finally {
      setSavingOrder(false);
    }
  };

  const cancelReordering = async () => {
    // Fetch the original order from the server
    try {
      const originalSets = await getSets();
      setSets(originalSets);
      setIsReorderMode(false);
    } catch (err) {
      setError('Failed to restore original order. Please refresh the page.');
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
        <div className="header-actions">
          {isAdmin && !isReorderMode && (
            <>
              <button 
                onClick={toggleReorderMode} 
                className="btn btn-secondary"
                disabled={sets.length < 2}
              >
                <span role="img" aria-label="Reorder">↕️</span> Reorder Sets
              </button>
              <Link to="/sets/create" className="btn">Create New Set</Link>
            </>
          )}
          {isAdmin && isReorderMode && (
            <div className="reorder-controls">
              <button 
                onClick={saveNewOrder} 
                className="btn btn-success"
                disabled={savingOrder}
              >
                {savingOrder ? 'Saving...' : 'Save New Order'}
              </button>
              <button 
                onClick={cancelReordering} 
                className="btn btn-secondary"
                disabled={savingOrder}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {isReorderMode && (
        <div className="reorder-instructions">
          <p>
            <span role="img" aria-label="Info">ℹ️</span> Drag and drop sets or use the arrows to reorder. Click "Save New Order" when you're done.
          </p>
        </div>
      )}

      {sets.length === 0 ? (
        <div className="no-sets">
          <p>No sets found.</p>
        </div>
      ) : (
        <div className={`set-list ${isReorderMode ? 'reorder-mode' : ''}`}>
          {sets.map((set, index) => (
            <div 
              key={set._id} 
              className={`set-item ${set.hidden ? 'hidden-set' : ''} ${isReorderMode ? 'reorder-item' : ''}`}
            >
              {isReorderMode && (
                <div className="set-position">
                  <span className="position-number">{index + 1}</span>
                </div>
              )}
              
              <div className="set-info">
                <h3 className="set-name">
                  {!isReorderMode ? (
                    <Link to={`/sets/${set._id}`}>{set.name}</Link>
                  ) : (
                    set.name
                  )}
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
              
              {isAdmin && !isReorderMode && (
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
              
              {isAdmin && isReorderMode && (
                <div className="set-reorder-controls">
                  <div className="move-buttons">
                    <button 
                      className="btn btn-move move-top"
                      onClick={() => moveSetToPosition(set._id, index, 0)}
                      disabled={reordering || index === 0}
                      title="Move to top"
                    >
                      ⤒
                    </button>
                    <button 
                      className="btn btn-move move-up"
                      onClick={() => moveSetUp(set._id, index)}
                      disabled={reordering || index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button 
                      className="btn btn-move move-down"
                      onClick={() => moveSetDown(set._id, index)}
                      disabled={reordering || index === sets.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button 
                      className="btn btn-move move-bottom"
                      onClick={() => moveSetToPosition(set._id, index, sets.length - 1)}
                      disabled={reordering || index === sets.length - 1}
                      title="Move to bottom"
                    >
                      ⤓
                    </button>
                  </div>
                  
                  <div className="position-selector">
                    <label htmlFor={`position-${set._id}`}>Position:</label>
                    <select 
                      id={`position-${set._id}`}
                      value={index}
                      onChange={(e) => moveSetToPosition(set._id, index, parseInt(e.target.value))}
                      disabled={reordering}
                    >
                      {sets.map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
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