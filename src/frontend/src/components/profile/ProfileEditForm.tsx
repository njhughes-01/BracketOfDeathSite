import React, { useState } from 'react';
import { apiClient } from '../../services/api';
import type { User } from '../../types/user';

interface ProfileEditFormProps {
  user: User;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ user, onSave, onCancel }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      onSave();
    } catch (err) {
      console.error('Profile update failed:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
          <span className="material-symbols-outlined text-base mt-0.5">error</span>
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="firstName" className="text-sm font-bold text-slate-400 ml-1">
          FIRST NAME
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-xl h-11 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="lastName" className="text-sm font-bold text-slate-400 ml-1">
          LAST NAME
        </label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-xl h-11 px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-11 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <div className="animate-spin size-5 border-2 border-black border-t-transparent rounded-full"></div>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </form>
  );
};

export default ProfileEditForm;
