import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import apiClient from '../services/api';

const Results: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    tournamentId: '',
    playerId: '',
    division: '',
    year: '',
    sort: '-tournament.date',
  });

  const getTournamentResults = useCallback(
    () => apiClient.getTournamentResults({
      page,
      limit: 20,
      ...filters
    }),
    [page, filters]
  );

  const { data: results, loading, error } = useApi(
    getTournamentResults,
    {
      immediate: true,
      dependencies: [page, filters]
    }
  );

  const getTournaments = useCallback(
    () => apiClient.getTournaments({ limit: 100 }),
    []
  );

  const { data: tournaments } = useApi(
    getTournaments,
    { immediate: true }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPlacementColor = (placement: number) => {
    switch (placement) {
      case 1:
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 2:
        return 'bg-slate-300/10 text-slate-300 border-slate-300/30';
      case 3:
        return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    }
  };

  const getPlacementIcon = (placement: number) => {
    switch (placement) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20 min-h-screen bg-background-dark p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">Tournament Results</h1>
          <Link to="/tournaments" className="px-5 py-2.5 bg-[#1c2230] hover:bg-white/5 border border-white/10 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">emoji_events</span>
            View Tournaments
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#1c2230] rounded-2xl border border-white/5 shadow-xl">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Tournament
            </label>
            <div className="relative">
              <select
                value={filters.tournamentId}
                onChange={(e) => handleFilterChange('tournamentId', e.target.value)}
                className="w-full bg-background-dark border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-primary appearance-none transition-colors"
              >
                <option value="">All Tournaments</option>
                {tournaments && 'data' in tournaments && Array.isArray(tournaments.data) ? tournaments.data.map((tournament: any) => (
                  <option key={tournament.id} value={tournament.id}>
                    #{tournament.bodNumber} - {tournament.location}
                  </option>
                )) : null}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Year
            </label>
            <div className="relative">
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full bg-background-dark border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-primary appearance-none transition-colors"
              >
                <option value="">All Years</option>
                {Array.from({ length: 16 }, (_, i) => 2024 - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Division
            </label>
            <input
              type="text"
              value={filters.division}
              onChange={(e) => handleFilterChange('division', e.target.value)}
              placeholder="All Divisions"
              className="w-full bg-background-dark border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-primary placeholder:text-slate-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sort By
            </label>
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full bg-background-dark border border-white/10 text-white text-sm rounded-xl p-3 focus:outline-none focus:border-primary appearance-none transition-colors"
              >
                <option value="-tournament.date">Date (Newest First)</option>
                <option value="tournament.date">Date (Oldest First)</option>
                <option value="totalStats.bodFinish">Best Finish First</option>
                <option value="-totalStats.bodFinish">Worst Finish First</option>
                <option value="-totalStats.winPercentage">Win % (High to Low)</option>
                <option value="totalStats.winPercentage">Win % (Low to High)</option>
                <option value="-totalStats.totalWon">Most Games Won</option>
                <option value="tournament.bodNumber">BOD Number</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-4 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 font-bold animate-pulse">Loading results...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-500/5 rounded-xl border border-red-500/20">
              <div className="size-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-red-500">error</span>
              </div>
              <p className="text-red-400 font-bold mb-1">Error loading results</p>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          ) : (results && 'data' in results && Array.isArray(results.data) && results.data.length > 0) ? (
            <div className="space-y-4">
              {results.data.map((result: any) => (
                <div key={result.id} className="bg-[#1c2230] rounded-2xl p-5 border border-white/5 hover:border-primary/50 transition-all shadow-lg hover:shadow-primary/5 group">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                      <div className={`size-16 rounded-2xl flex items-center justify-center border-2 text-3xl shadow-[0_0_15px_rgba(0,0,0,0.3)] ${getPlacementColor(result.totalStats?.bodFinish || 0)}`}>
                        {getPlacementIcon(result.totalStats?.bodFinish || 0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h3 className="font-black text-white text-xl leading-tight group-hover:text-primary transition-colors">
                            {result.teamName || 'Team'}
                          </h3>
                          {result.totalStats?.bodFinish && result.totalStats?.bodFinish <= 3 && (
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${getPlacementColor(result.totalStats?.bodFinish)}`}>
                              {result.totalStats?.bodFinish === 1 ? 'Champion' :
                                result.totalStats?.bodFinish === 2 ? 'Finalist' :
                                  '3rd Place'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 font-medium">
                          BOD #{result.tournament?.bodNumber} <span className="text-slate-600 mx-1">•</span> {result.tournament?.location}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          {formatDate(result.tournament?.date || result.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-10 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                      <div className="text-center">
                        <p className="text-xl font-black text-white">
                          {result.totalStats?.totalWon || 0}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Won</p>
                      </div>

                      <div className="text-center">
                        <p className="text-xl font-black text-white">
                          {result.totalStats?.totalPlayed || 0}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Played</p>
                      </div>

                      <div className="text-center">
                        <p className="text-xl font-black text-accent">
                          {result.totalStats?.totalPlayed > 0 ?
                            ((result.totalStats?.totalWon / result.totalStats?.totalPlayed) * 100).toFixed(0) + '%' :
                            '0%'
                          }
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Win Rate</p>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Link
                          to={`/tournaments/${result.tournamentId || result.tournament?.id || result.tournament?._id}`}
                          className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all"
                        >
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </Link>
                        <div className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                          {result.division || 'Open'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#1c2230] rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center">
              <div className="size-20 bg-background-dark rounded-full flex items-center justify-center mb-6 text-5xl grayscale opacity-50">
                📊
              </div>
              <h3 className="text-white font-bold text-xl mb-2">No results found</h3>
              <p className="text-slate-400 mb-8 max-w-sm">
                We couldn't find any results matching your filters. Try adjusting your search criteria.
              </p>
              <button
                onClick={() => setFilters({ tournamentId: '', playerId: '', division: '', year: '', sort: '-tournament.date' })}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-sm transition-all"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {results && 'pagination' in results && (results as any).pagination && (results as any).pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-5 py-2.5 rounded-xl bg-[#1c2230] border border-white/10 text-white font-bold disabled:opacity-30 hover:bg-white/5 transition-all text-sm"
            >
              Previous
            </button>

            <span className="text-sm font-bold text-slate-400">
              Page <span className="text-white">{page}</span> of <span className="text-white">{results && 'pagination' in results && (results as any).pagination ? (results as any).pagination.pages : 1}</span>
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={results && 'pagination' in results ? page === (results as any).pagination.pages : true}
              className="px-5 py-2.5 rounded-xl bg-[#1c2230] border border-white/10 text-white font-bold disabled:opacity-30 hover:bg-white/5 transition-all text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;