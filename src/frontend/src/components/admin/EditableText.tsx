import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  validator?: (value: string) => string | null;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  placeholder = "Click to edit...",
  multiline = false,
  className = "",
  displayClassName = "",
  editClassName = "",
  disabled = false,
  required = false,
  maxLength,
  validator,
}) => {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!multiline) {
        inputRef.current.select();
      }
    }
  }, [isEditing, multiline]);

  const handleEdit = () => {
    if (!isAdmin || disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    if (required && !editValue.trim()) {
      setError("This field is required");
      return;
    }

    if (validator) {
      const validationError = validator(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isAdmin) {
    return (
      <span className={`${className} ${displayClassName}`}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <div className={`relative ${className}`}>
        <InputComponent
          ref={inputRef as any}
          type={multiline ? undefined : "text"}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isLoading}
          className={`input ${editClassName} ${
            error ? "border-red-500 focus:ring-red-500" : ""
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          rows={multiline ? 3 : undefined}
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
        !disabled
          ? "cursor-pointer hover:bg-gray-100 hover:text-blue-600 rounded px-1 -mx-1 transition-colors"
          : ""
      } ${!value ? "text-gray-400 italic" : ""}`}
      title={!disabled ? "Click to edit" : undefined}
    >
      {value || placeholder}
    </span>
  );
};

export default EditableText;
