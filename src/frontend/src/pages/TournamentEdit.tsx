import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi, useMutation } from '../hooks/useApi';
import apiClient from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TournamentInput } from '../types/api';

const TournamentEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<TournamentInput>({
        date: '',
        bodNumber: 0,
        format: 'Mixed',
        location: '',
        advancementCriteria: '',
        notes: '',
        photoAlbums: '',
        status: 'scheduled',
        maxPlayers: 16
    });

    // Fetch Tournament Data
    const { data: tournament, loading: fetchLoading, error: fetchError } = useApi(
        () => apiClient.getTournament(id!),
        { immediate: true }
    );

    // Update Form when data loads
    useEffect(() => {
        if (tournament) {
            const t = tournament as any;
            setFormData({
                date: t.date ? new Date(t.date).toISOString().split('T')[0] : '', // Format for date input
                bodNumber: t.bodNumber || 0,
                format: t.format || 'Mixed',
                location: t.location || '',
                advancementCriteria: t.advancementCriteria || '',
                notes: t.notes || '',
                photoAlbums: t.photoAlbums || '',
                status: t.status || 'scheduled',
                maxPlayers: t.maxPlayers || 16
            });
        }
    }, [tournament]);

    // Mutation for Update
    const { mutate: updateTournament, loading: saveLoading, error: saveError } = useMutation(
        (data: TournamentInput) => apiClient.updateTournament(id!, data),
        {
            onSuccess: () => navigate(`/tournaments/${id}`),
        }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            // @ts-ignore
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTournament(formData);
    };

    const formatOptions = [
        { value: 'M', label: "Men's" },
        { value: 'W', label: "Women's" },
        { value: 'Mixed', label: "Mixed" },
        { value: "Men's Singles", label: "Men's Singles" },
        { value: "Men's Doubles", label: "Men's Doubles" },
        { value: "Women's Doubles", label: "Women's Doubles" },
        { value: "Mixed Doubles", label: "Mixed Doubles" }
    ];

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (fetchError || !tournament) {
        return (
            <div className="p-8 text-center bg-background-dark min-h-screen text-white">
                <h2 className="text-xl font-bold mb-4">Error loading tournament</h2>
                <button onClick={() => navigate('/tournaments')} className="text-primary hover:underline">
                    Return to Tournaments
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-dark pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-3">
                <button onClick={() => navigate(`/tournaments/${id}`)} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-white">Edit Tournament</h1>
            </div>

            <div className="flex-1 p-4 max-w-lg mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Details</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1 ml-1">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date as string}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1 ml-1">BOD #</label>
                                <input
                                    type="number"
                                    name="bodNumber"
                                    value={formData.bodNumber}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Format</label>
                            <select
                                name="format"
                                // @ts-ignore
                                value={formData.format}
                                // @ts-ignore
                                onChange={handleChange}
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                            >
                                {formatOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Status</label>
                            <select
                                name="status"
                                // @ts-ignore
                                value={formData.status}
                                // @ts-ignore
                                onChange={handleChange}
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="open">Open</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Advancement Criteria</label>
                            <textarea
                                name="advancementCriteria"
                                value={formData.advancementCriteria}
                                onChange={handleChange}
                                rows={2}
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1 ml-1">Photo Album URL</label>
                            <input
                                type="text"
                                name="photoAlbums"
                                value={formData.photoAlbums || ''}
                                onChange={handleChange}
                                placeholder="Optional"
                                className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </div>
                    </div>

                    {saveError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            Error saving: {saveError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saveLoading}
                        className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-50 hover:bg-primary-dark transition-all"
                    >
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TournamentEdit;
