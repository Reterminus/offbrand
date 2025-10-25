import React, { useState, useRef, useEffect } from 'react';

const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = "Select options...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionToggle = (option) => {
    const newSelectedValues = selectedValues.includes(option)
      ? selectedValues.filter(value => value !== option)
      : [...selectedValues, option];
    
    onChange(newSelectedValues);
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
        <div className="multi-select-dropdown-content">
          <div className="multi-select-options">
            {options.length === 0 ? (
              <div className="multi-select-no-options">No options found</div>
            ) : (
              options.map(option => (
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
