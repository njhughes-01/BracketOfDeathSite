import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../ui/Card';

interface EditableCardProps {
  title: string;
  children: React.ReactNode;
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'hover' | 'gradient' | 'compact';
  isEditing?: boolean;
  showEditButton?: boolean;
  disabled?: boolean;
}

const EditableCard: React.FC<EditableCardProps> = ({
  title,
  children,
  onSave,
  onCancel,
  className = "",
  padding = "lg",
  variant = "default",
  isEditing: externalIsEditing,
  showEditButton = true,
  disabled = false
}) => {
  const { isAdmin } = useAuth();
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use external editing state if provided, otherwise use internal state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const setIsEditing = externalIsEditing !== undefined ? () => { } : setInternalIsEditing;

  const handleEdit = () => {
    if (!isAdmin || disabled) return;
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!onSave) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setIsEditing(false);
    setError(null);
  };

  return (
    <Card
      className={`relative ${className}`}
      padding={padding}
      variant={variant}
    >
      {/* Header with title and controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

        {isAdmin && showEditButton && (
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                disabled={disabled}
                className={`text-sm px-3 py-1 rounded-md transition-colors ${disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200'
                  }`}
                title={disabled ? 'Editing disabled' : 'Edit this section'}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className={`text-sm px-3 py-1 rounded-md transition-colors ${isLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-200'
                    }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 inline mr-1"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className={`text-sm px-3 py-1 rounded-md transition-colors ${isLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={isEditing ? 'space-y-4' : ''}>
        {children}
      </div>

      {/* Overlay for loading state */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Saving changes...</span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EditableCard;