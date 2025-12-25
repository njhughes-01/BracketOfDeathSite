import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface EditableDateProps {
  value: string | Date;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  editClassName?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  validator?: (value: string) => string | null;
}

const EditableDate: React.FC<EditableDateProps> = ({
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
  validator,
}) => {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert value to YYYY-MM-DD format for input
  const formatDateForInput = (dateValue: string | Date): string => {
    if (!dateValue) return "";
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  // Format date for display
  const formatDateForDisplay = (dateValue: string | Date): string => {
    if (!dateValue) return placeholder;
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return placeholder;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    setEditValue(formatDateForInput(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (!isAdmin || disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const validateDate = (dateStr: string): string | null => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return "Please enter a valid date";
    }

    // Check backend constraints: between 2009 and 10 years in the future
    const minDate = new Date("2009-01-01");
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);

    if (date < minDate || date > maxDate) {
      return "Date must be between 2009 and 10 years in the future";
    }

    if (min && date < new Date(min)) {
      return `Date must be after ${new Date(min).toLocaleDateString()}`;
    }

    if (max && date > new Date(max)) {
      return `Date must be before ${new Date(max).toLocaleDateString()}`;
    }

    if (validator) {
      return validator(dateStr);
    }

    return null;
  };

  const handleSave = async () => {
    if (editValue === formatDateForInput(value)) {
      setIsEditing(false);
      return;
    }

    if (required && !editValue) {
      setError("This field is required");
      return;
    }

    if (editValue) {
      const validationError = validateDate(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to ISO string for backend
      const dateToSave = editValue ? new Date(editValue).toISOString() : "";
      await onSave(dateToSave);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(formatDateForInput(value));
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isAdmin) {
    return (
      <span className={`${className} ${displayClassName}`}>
        {formatDateForDisplay(value)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          min={min}
          max={max}
          disabled={isLoading}
          className={`input ${editClassName} ${
            error ? "border-red-500 focus:ring-red-500" : ""
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
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
      {formatDateForDisplay(value)}
    </span>
  );
};

export default EditableDate;
