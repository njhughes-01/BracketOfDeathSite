import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, useMutation } from '../hooks/useApi';
import apiClient from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { PlayerInput } from '../types/api';

const PlayerEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<PlayerInput>({
        name: '',
        pairing: '',
        winningPercentage: 0,
        totalChampionships: 0,
        gamesPlayed: 0,
        bodsPlayed: 0,
        isActive: true,
    });

    // Fetch Player Data
    const { data: player, loading: fetchLoading, error: fetchError } = useApi(
        () => apiClient.getPlayer(id!),
        { immediate: true }
    );

    // Update Form when data loads
    useEffect(() => {
        if (player) {
            const p = player as any; // Cast to access fields
            setFormData({
                name: p.name || '',
                pairing: p.pairing || '',
                winningPercentage: p.winningPercentage || 0,
                totalChampionships: p.totalChampionships || 0,
                gamesPlayed: p.gamesPlayed || 0,
                bodsPlayed: p.bodsPlayed || 0,
                isActive: p.isActive !== undefined ? p.isActive : true,
            });
        }
    }, [player]);

    // Mutation for Update
    const { mutate: updatePlayer, loading: saveLoading, error: saveError } = useMutation(
        (data: PlayerInput) => apiClient.updatePlayer(id!, data),
        {
            onSuccess: () => navigate(`/players/${id}`),
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updatePlayer(formData);
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (fetchError || !player) {
        return (
            <div className="p-8 text-center bg-background-dark min-h-screen text-white">
                <h2 className="text-xl font-bold mb-4">Error loading player</h2>
                <button onClick={() => navigate('/players')} className="text-primary hover:underline">
                    Return to Players
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-3">
                <button onClick={() => navigate(`/players/${id}`)} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-white">Edit Player</h1>
            </div>

            <div className="flex-1 p-4 max-w-lg mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Basic Info</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1 ml-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1 ml-1">Usual Partner</label>
                                <input
                                    type="text"
                                    name="pairing"
                                    value={formData.pairing}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                    className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="bg-[#1c2230] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white">Active Status</h3>
                            <p className="text-xs text-slate-400">Inactive players won't appear in selection lists.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={!!formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    {/* Stats Overrides */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Stats Overrides</h3>
                            <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">Admin Only</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                                <label className="block text-xs text-slate-500 mb-1">Win %</label>
                                <input
                                    type="number"
                                    name="winningPercentage"
                                    value={formData.winningPercentage}
                                    onChange={handleChange}
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                                />
                            </div>
                            <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                                <label className="block text-xs text-slate-500 mb-1">Titles</label>
                                <input
                                    type="number"
                                    name="totalChampionships"
                                    value={formData.totalChampionships}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                                />
                            </div>
                            <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                                <label className="block text-xs text-slate-500 mb-1">Games Played</label>
                                <input
                                    type="number"
                                    name="gamesPlayed"
                                    value={formData.gamesPlayed}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                                />
                            </div>
                            <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                                <label className="block text-xs text-slate-500 mb-1">BODs Played</label>
                                <input
                                    type="number"
                                    name="bodsPlayed"
                                    value={formData.bodsPlayed}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    {saveError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            Error saving: {saveError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saveLoading || !formData.name}
                        className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-50 hover:bg-primary-dark transition-all"
                    >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PlayerEdit;
