import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface EditableNumberProps {
  value: number | undefined;
  onSave: (value: number) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  validator?: (value: number) => string | null;
}

const EditableNumber: React.FC<EditableNumberProps> = ({
  value,
  onSave,
  placeholder = "Click to edit...",
  className = "",
  displayClassName = "",
  editClassName = "",
  disabled = false,
  required = false,
  min,
  max,
  step = 1,
  integer = false,
  validator
}) => {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!isAdmin || disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const validateNumber = (numValue: number): string | null => {
    if (integer && !Number.isInteger(numValue)) {
      return 'Value must be a whole number';
    }

    if (min !== undefined && numValue < min) {
      return `Value must be at least ${min}`;
    }

    if (max !== undefined && numValue > max) {
      return `Value must be at most ${max}`;
    }

    if (validator) {
      return validator(numValue);
    }

    return null;
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    if (required && !trimmedValue) {
      setError('This field is required');
      return;
    }

    if (trimmedValue === '') {
      if (value === undefined) {
        setIsEditing(false);
        return;
      }
      // Saving empty value when there was a previous value
      setIsLoading(true);
      setError(null);
      try {
        await onSave(0); // or handle undefined based on your needs
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const numValue = parseFloat(trimmedValue);
    
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (value === numValue) {
      setIsEditing(false);
      return;
    }

    const validationError = validateNumber(numValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdmin) {
    return (
      <span className={`${className} ${displayClassName}`}>
        {value !== undefined ? value.toString() : placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={isLoading}
          className={`input ${editClassName} ${
            error ? 'border-red-500 focus:ring-red-500' : ''
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
        <div className="flex items-center space-x-2 mt-1">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <span
      onClick={handleEdit}
      className={`${className} ${displayClassName} ${
        !disabled ? 'cursor-pointer hover:bg-gray-100 hover:text-blue-600 rounded px-1 -mx-1 transition-colors' : ''
      } ${value === undefined ? 'text-gray-400 italic' : ''}`}
      title={!disabled ? "Click to edit" : undefined}
    >
      {value !== undefined ? value.toString() : placeholder}
    </span>
  );
};

export default EditableNumber;