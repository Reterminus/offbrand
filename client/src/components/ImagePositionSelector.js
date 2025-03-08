import React, { useState, useRef, useEffect, useCallback } from 'react';

const ImagePositionSelector = ({ imageUrl, initialPosition, onChange }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const lastUpdateRef = useRef(0);
  const positionRef = useRef(position);

  // Parse initial position into x, y percentages
  useEffect(() => {
    if (initialPosition) {
      if (initialPosition.includes('%')) {
        const [x, y] = initialPosition.split(' ').map(val => 
          parseInt(val.replace('%', ''), 10)
        );
        if (!isNaN(x) && !isNaN(y)) {
          setPosition({ x, y });
          positionRef.current = { x, y };
        }
      } else {
        const positionMap = {
          'center': { x: 50, y: 50 },
          'top': { x: 50, y: 0 },
          'bottom': { x: 50, y: 100 },
          'left': { x: 0, y: 50 },
          'right': { x: 100, y: 50 },
          'top left': { x: 0, y: 0 },
          'top right': { x: 100, y: 0 },
          'bottom left': { x: 0, y: 100 },
          'bottom right': { x: 100, y: 100 }
        };
        
        const newPosition = positionMap[initialPosition] || { x: 50, y: 50 };
        setPosition(newPosition);
        positionRef.current = newPosition;
      }
    }
  }, [initialPosition]);

  // Update container and image sizes on mount and resize
  useEffect(() => {
    const updateSizes = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
        
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
      }
    };

    updateSizes();
    const resizeObserver = new ResizeObserver(updateSizes);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [imageUrl]);

  // Debounced position update
  const updatePosition = useCallback((clientX, clientY) => {
    if (!containerRef.current) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return; // Limit to ~60fps
    lastUpdateRef.current = now;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    positionRef.current = { x, y };
    setPosition({ x, y });
  }, []);

  // Notify parent of position changes
  useEffect(() => {
    const backgroundPosition = `${position.x}% ${position.y}%`;
    onChange(backgroundPosition);
  }, [position, onChange]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
    
    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        updatePosition(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isDragging, updatePosition]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
    
    const handleTouchMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging && e.touches && e.touches[0]) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [isDragging, updatePosition]);

  // Preset position buttons
  const presetPositions = [
    { name: 'Center', x: 50, y: 50 },
    { name: 'Top', x: 50, y: 0 },
    { name: 'Bottom', x: 50, y: 100 },
    { name: 'Left', x: 0, y: 50 },
    { name: 'Right', x: 100, y: 50 }
  ];

  const handlePresetClick = useCallback((preset) => {
    setPosition({ x: preset.x, y: preset.y });
    positionRef.current = { x: preset.x, y: preset.y };
  }, []);

  return (
    <div className="image-position-selector">
      <div className="position-preview-container">
        <div 
          ref={containerRef}
          className="position-preview"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundSize: 'cover',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div 
            ref={imageRef}
            className="position-indicator"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`
            }}
          ></div>
          <div className="position-instructions">
            Drag to adjust image position
          </div>
        </div>
      </div>
      <div className="position-controls">
        <div className="position-presets">
          {presetPositions.map(preset => (
            <button 
              key={preset.name}
              type="button" 
              className="position-preset"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="position-values">
          X: {Math.round(position.x)}%, Y: {Math.round(position.y)}%
        </div>
      </div>
    </div>
  );
};

export default ImagePositionSelector; 