import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getKeywords, deleteKeyword } from '../services/api';
import { AuthContext } from '../context/AuthContext';

const KeywordList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const data = await getKeywords();
        setKeywords(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch keywords. Please try again later.');
        setLoading(false);
      }
    };

    fetchKeywords();
  }, []);

  const handleEdit = (id) => {
    navigate(`/keywords/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this keyword?')) {
      try {
        await deleteKeyword(id);
        setKeywords(keywords.filter(keyword => keyword._id !== id));
      } catch (err) {
        setError('Failed to delete keyword. Please try again later.');
      }
    }
  };

  // Filter keywords based on search term
  const filteredKeywords = keywords.filter(keyword => 
    keyword.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading keywords...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="keyword-list-page">
      <div className="header">
        <h1>Keywords</h1>
        {isAdmin && (
          <Link to="/keywords/create" className="btn">Create New Keyword</Link>
        )}
      </div>

      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredKeywords.length === 0 ? (
        <div className="no-keywords">
          <p>
            {keywords.length === 0 
              ? `No keywords found. ${isAdmin ? 'Create your first keyword!' : ''}` 
              : 'No keywords match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="keyword-list">
          {filteredKeywords.map(keyword => (
            <div 
              className="keyword-item" 
              key={keyword._id}
              style={{
                '--keyword-image': `url(${keyword.imageUrl})`,
                '--keyword-image-position': keyword.imagePosition || '50% 50%'
              }}
            >
              <div className="keyword-item-content">
                <h2 className="keyword-title">{keyword.title}</h2>
                <p className="keyword-description">{keyword.description}</p>
                
                {isAdmin && (
                  <div className="keyword-item-actions">
                    <button 
                      className="btn btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(keyword._id);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(keyword._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KeywordList; 