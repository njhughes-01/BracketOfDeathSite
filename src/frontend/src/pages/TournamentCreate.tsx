import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '../hooks/useApi';
import apiClient from '../services/api';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TournamentInput } from '../types/api';

const TournamentCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TournamentInput>({
    date: '',
    format: 'Mixed',
    location: '',
    advancementCriteria: '',
    notes: '',
    photoAlbums: '',
    registrationType: 'open',
    allowSelfRegistration: true,
  });

  const { mutate: createTournament, loading, error } = useMutation(
    (data: TournamentInput) => apiClient.createTournament(data),
    {
      onSuccess: (data) => {
        navigate('/tournaments');
      },
      onError: (error) => {
        console.error('Failed to create tournament:', error);
      }
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? undefined : parseInt(value);
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'datetime-local') {
      processedValue = value ? new Date(value).toISOString() : '';
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTournament(formData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Tournament</h1>
          <p className="text-gray-600">Add a new tournament to the system</p>
        </div>
        <button
          onClick={() => navigate('/tournaments')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Type *
                </label>
                <select
                  name="registrationType"
                  value={formData.registrationType}
                  onChange={handleChange}
                  required
                  className="select"
                >
                  <option value="open">Open Registration</option>
                  <option value="preselected">Admin Selected</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Open: Players can register themselves. Admin Selected: Admin chooses players.
                </p>
              </div>
            </div>
          </div>

          {/* Registration Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Players
                </label>
                <select
                  name="maxPlayers"
                  value={formData.maxPlayers || ''}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="">No limit</option>
                  <option value="4">4 players</option>
                  <option value="8">8 players</option>
                  <option value="16">16 players</option>
                  <option value="32">32 players</option>
                  <option value="64">64 players</option>
                </select>
              </div>

              {formData.registrationType === 'open' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    name="registrationDeadline"
                    value={formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString().slice(0, 16) : ''}
                    onChange={handleChange}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When registration closes (defaults to tournament start time)
                  </p>
                </div>
              )}
            </div>

            {formData.registrationType === 'open' && (
              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="allowSelfRegistration"
                    checked={formData.allowSelfRegistration || false}
                    onChange={handleChange}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    Allow players to register themselves online
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Format and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format *
              </label>
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
                required
                className="select"
              >
                <option value="Mixed">Mixed</option>
                <option value="M">Men's</option>
                <option value="W">Women's</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="input"
                placeholder="Enter tournament location"
              />
            </div>
          </div>

          {/* Advancement Criteria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advancement Criteria *
            </label>
            <textarea
              name="advancementCriteria"
              value={formData.advancementCriteria}
              onChange={handleChange}
              required
              rows={3}
              className="input"
              placeholder="Describe how players advance through the tournament..."
            />
          </div>

          {/* Optional Fields */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={3}
                  className="input"
                  placeholder="Any additional notes about the tournament..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Albums
                </label>
                <input
                  type="text"
                  name="photoAlbums"
                  value={formData.photoAlbums || ''}
                  onChange={handleChange}
                  className="input"
                  placeholder="Links to photo albums (comma-separated)"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-500 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error creating tournament</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.date || !formData.location || !formData.advancementCriteria}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating...</span>
                </>
              ) : (
                'Create Tournament'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Preview */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Preview</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">
                #Auto
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">
                {formData.format === 'M' ? "Men's" : 
                 formData.format === 'W' ? "Women's" : 
                 "Mixed"} Tournament
              </h4>
              <p className="text-sm text-gray-600">
                {formData.location || 'Location not specified'}
              </p>
              <p className="text-xs text-blue-600">
                {formData.registrationType === 'open' ? 'Open Registration' : 'Admin Selected'}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {formData.date ? new Date(formData.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Not specified'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">BOD Number:</span>
              <span className="font-medium text-blue-600">Auto-generated</span>
            </div>
            {formData.maxPlayers && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Max Players:</span>
                <span className="font-medium">{formData.maxPlayers}</span>
              </div>
            )}
            {formData.registrationDeadline && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Registration Deadline:</span>
                <span className="font-medium">
                  {new Date(formData.registrationDeadline).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
            {formData.notes && (
              <div className="flex items-start space-x-2">
                <span className="text-gray-600">Notes:</span>
                <span className="font-medium">{formData.notes}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TournamentCreate;