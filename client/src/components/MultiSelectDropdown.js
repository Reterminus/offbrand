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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);

  const calculateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        calculateDropdownPosition();
      }
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
    <>
      <div className={`multi-select-dropdown ${className} ${disabled ? 'disabled' : ''}`}>
        <div 
          ref={triggerRef}
          className={`multi-select-trigger ${isOpen ? 'open' : ''}`}
          onClick={handleToggle}
        >
          <span className="multi-select-value">{getDisplayText()}</span>
          <span className="multi-select-arrow">▼</span>
        </div>
      </div>
      
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="multi-select-dropdown-content"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 1500
          }}
        >
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
    </>
  );
};

export default MultiSelectDropdown;
