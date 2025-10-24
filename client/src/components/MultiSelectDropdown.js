import React, { useState, useRef, useEffect } from 'react';

const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false,
  maxHeight = "200px"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleOptionToggle = (option) => {
    const newSelectedValues = selectedValues.includes(option)
      ? selectedValues.filter(value => value !== option)
      : [...selectedValues, option];
    
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length) {
      // Deselect all filtered options
      const newSelectedValues = selectedValues.filter(value => 
        !filteredOptions.includes(value)
      );
      onChange(newSelectedValues);
    } else {
      // Select all filtered options
      const newSelectedValues = [...new Set([...selectedValues, ...filteredOptions])];
      onChange(newSelectedValues);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    if (selectedValues.length === 1) {
      return selectedValues[0];
    }
    if (selectedValues.length <= 3) {
      return selectedValues.join(', ');
    }
    return `${selectedValues.length} selected`;
  };

  const allFilteredSelected = filteredOptions.length > 0 && 
    filteredOptions.every(option => selectedValues.includes(option));

  return (
    <div className={`multi-select-dropdown ${className} ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <div 
        className={`multi-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
      >
        <span className="multi-select-value">{getDisplayText()}</span>
        <span className="multi-select-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="multi-select-dropdown-content" style={{ maxHeight }}>
          <div className="multi-select-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="multi-select-search-input"
            />
          </div>
          
          <div className="multi-select-actions">
            <button
              type="button"
              className="multi-select-action-btn"
              onClick={handleSelectAll}
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
            {selectedValues.length > 0 && (
              <button
                type="button"
                className="multi-select-action-btn"
                onClick={handleClearAll}
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-no-options">No options found</div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option}
                  className={`multi-select-option ${selectedValues.includes(option) ? 'selected' : ''}`}
                  onClick={() => handleOptionToggle(option)}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => {}} // Handled by onClick
                    className="multi-select-checkbox"
                  />
                  <span className="multi-select-option-text">{option}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
