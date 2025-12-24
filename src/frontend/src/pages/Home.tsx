import React, { useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if system is initialized on mount
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const status = await apiClient.getSystemStatus();
        if (!status.data?.initialized) {
          // System not initialized - redirect to setup
          navigate('/setup', { replace: true });
        }
      } catch (error) {
        console.error('Failed to check system status:', error);
      }
    };
    checkSystemStatus();
  }, [navigate]);

  // Data Fetching
  const getRecentTournaments = useCallback(() => apiClient.getRecentTournaments(5), []);
  const getUpcoming = useCallback(() => apiClient.getUpcomingTournaments(5), []);

  // Parallel fetching
  const { data: recentTournaments, loading: recentLoading } = useApi(getRecentTournaments, { immediate: true });
  const { data: upcomingData, loading: upcomingLoading } = useApi(getUpcoming, { immediate: true });

  // Extract upcoming hero tournament (first one)
  const nextTournament = useMemo(() => {
    const raw = upcomingData as any;
    const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
    return list.length > 0 ? list[0] : null;
  }, [upcomingData]);

  // Upcoming list (skip the first one if it's the hero, or show all?)
  // Usually hero is the immediate next. Let's show all upcoming in the list excluding hero if desired, 
  // but for now showing all is fine or slice(1).
  const upcomingList = useMemo(() => {
    const raw = upcomingData as any;
    const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
    return list;
  }, [upcomingData]);

  // For Recent Results, get most recent completed
  const latestCompleted = useMemo(() => {
    const raw = recentTournaments as any;
    const list = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
    return list.find((t: any) => t.status === 'completed');
  }, [recentTournaments]);

  // Fetch matches for the latest completed tournament to show "results"
  const getFinalsMatches = useCallback(() => {
    if (latestCompleted) {
      // Try to get finals
      return apiClient.getTournamentMatches(latestCompleted.id, 'final');
    }
    return Promise.resolve({ success: true, data: [] });
  }, [latestCompleted]);

  const { data: finalsMatchesData } = useApi(getFinalsMatches, {
    immediate: !!latestCompleted,
    dependencies: [latestCompleted?.id]
  });

  const recentResults = useMemo(() => {
    if (finalsMatchesData && 'data' in finalsMatchesData && Array.isArray(finalsMatchesData.data)) {
      return finalsMatchesData.data;
    }
    return [];
  }, [finalsMatchesData]);


  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Top App Bar - Home Specific */}
      <div className="sticky top-0 z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 p-4 pb-2 transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-accent bg-gray-600" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDn4ONv5GoY6oaJbh2LpgGqejlPqoD2Cy-Pj0UsyzI5Jm2zHoFvSC_8Ek-hYKtnwgR2oaCzWhg1CbhPFyfwDAlI4NNr8qZhb7dIf50bgIc28jNnDE5sTFhkYmYLdb3AuoghPWW0MD8_cTLXmisd3A0_rRtOoRCGOoRp1L69yVnMZ19OSC6vujUnNepDPrWPIuMz6T3H-eBsIwNwJiHOkg9m1DUwE7h0Q2QQJLxy4JKmHQdsWl25pPv3wypK9EC7xeE6v9iG-Z_AcpU")' }}></div>
              <div className="absolute bottom-0 right-0 size-3 bg-accent rounded-full border-2 border-background-dark"></div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Welcome back</p>
              <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">{user ? user.username : 'Guest'}</h2>
            </div>
          </div>
          <button className="relative flex items-center justify-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-white">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-background-dark"></span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4">
        {/* Dynamic Hero Card */}
        {nextTournament ? (
          <Link to={`/tournaments/${nextTournament.id}`} className="relative overflow-hidden rounded-2xl bg-primary shadow-xl shadow-primary/20 group cursor-pointer block min-h-[220px]">
            {/* Background Image with Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuArfVEx5fb164F7A5wImLDhdzfcSW6LnHlwPVwOrKjRtLggvCj1itnaz5XN7nguDVCtG-LIKOmQulidI4n8ALkhyEmAG1WYypbKjBR8KWR6SihPLdXTyQ6OVw2NM56nRlyL--H7QHfytRz4iv9oUd7UwpBJCICbEYfvaVsubL9Qu-PN1eg_0DlZqGLQWLtSp2YbjgvUmr-s78-PTfyVElfYP0csdy5hZELB8ii7cq42JsinCdWrqMiKi_dP9NWOKWtbx6ksXq8z4ZI")' }}
            >
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

            <div className="relative p-5 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <span className="inline-flex items-center px-2 py-1 rounded bg-accent text-black text-xs font-bold uppercase tracking-wider">
                  <span className="size-1.5 bg-black rounded-full mr-1.5 animate-pulse"></span>
                  Next Match
                </span>
                <div className="size-8 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-sm text-white group-hover:bg-white group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </div>
              </div>

              <div className="space-y-1 mt-auto pt-10">
                <p className="text-white/80 text-sm font-medium tracking-wide border-l-2 border-accent pl-2 mb-2">{nextTournament.division || "Open Division"}</p>
                <h3 className="text-white text-2xl font-bold leading-tight line-clamp-2 md:line-clamp-1">{nextTournament.name || `${nextTournament.format} Tournament`}</h3>
                <div className="flex items-center gap-4 text-white/90 text-sm mt-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span>{new Date(nextTournament.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    <span>{nextTournament.location || "TBD"}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          // Placeholder / Empty State for Hero
          <div className="relative overflow-hidden rounded-2xl bg-surface-dark shadow-xl group cursor-pointer h-[220px] flex items-center justify-center border border-white/10">
            <div className="text-center">
              <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-white/50">event_busy</span>
              </div>
              <h3 className="text-white font-bold">No Upcoming Events</h3>
              <p className="text-slate-400 text-sm mt-1">Check back later for new tournaments</p>
            </div>
          </div>
        )}


        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3">
          <Link to="/tournaments" className="flex flex-col items-center gap-2 group">
            <div className="size-14 rounded-2xl bg-white dark:bg-card-dark shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">how_to_reg</span>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">Register</span>
          </Link>
          <Link to="/tournaments" className="flex flex-col items-center gap-2 group">
            <div className="size-14 rounded-2xl bg-white dark:bg-card-dark shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">calendar_month</span>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">Schedule</span>
          </Link>
          <Link to="/rankings" className="flex flex-col items-center gap-2 group">
            <div className="size-14 rounded-2xl bg-white dark:bg-card-dark shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">leaderboard</span>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">Rankings</span>
          </Link>
          <Link to="/news" className="flex flex-col items-center gap-2 group">
            <div className="size-14 rounded-2xl bg-white dark:bg-card-dark shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">newspaper</span>
            </div>
            <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">News</span>
          </Link>
        </div>

        {/* Upcoming Tournaments (Horizontal List) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-slate-900 dark:text-white text-base font-bold tracking-tight uppercase">Upcoming Tournaments</h3>
            <Link to="/tournaments" className="text-primary hover:text-accent text-sm font-medium transition-colors">View All</Link>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x">
            {recentLoading || upcomingLoading ? (
              <div className="snap-center shrink-0 w-72 h-48 bg-surface-dark rounded-xl animate-pulse"></div>
            ) : (
              upcomingList.map((tournament: any) => (
                <Link to={`/tournaments/${tournament.id}`} key={tournament.id} className="snap-center shrink-0 w-72 bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg group">
                  <div
                    className="h-32 w-full bg-slate-800 bg-cover bg-center relative"
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDs4Rg62avhO7PVlknbRQHZ47NhVuedDdpFxyLhxX_BBYvI4mVWtSOruP4Zu6-x7CjiPp4tdwFP16wG3vf4c-8EKSCAPD-mBn6DGj2dMt6VFsRzo4sEOQZt7JZkHlvifFco5zvUWN64pxPufaltzULn6vDYJRwLC8YdBdJm_DwTlorOKemtan5pGAEX0VSX_z5YH2kDbjEasDue9apfkf7Q3puogbPwJ6azohpPSqS1kYETVsYx8Nuk0Sv-O4vTVGxDdSwc0h9TT0U")' }}
                  >
                    <div className="absolute top-2 right-2 bg-blue-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                      {tournament.format || "Standard"}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                        {tournament.name || `BOD #${tournament.bodNumber}`}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {new Date(tournament.date).toLocaleDateString()} • {tournament.location || "Local Court"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex -space-x-2">
                        {/* Mock avatars for visual flair as per New UI */}
                        <div className="size-6 rounded-full bg-gray-600 border border-card-dark"></div>
                        <div className="size-6 rounded-full bg-gray-500 border border-card-dark"></div>
                        <div className="size-6 rounded-full bg-gray-400 border border-card-dark flex items-center justify-center text-[8px] text-white">+{tournament.currentPlayerCount || 0}</div>
                      </div>
                      <span className="text-accent-lime text-sm font-bold bg-accent-lime/10 px-3 py-1.5 rounded hover:bg-accent-lime hover:text-black transition-all">Register</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
            {!upcomingLoading && upcomingList.length === 0 && (
              <div className="w-full text-center py-6 text-slate-500 text-sm italic col-span-full">No additional upcoming tournaments.</div>
            )}
          </div>
        </div>

        {/* Recent Results (Dynamic) */}
        {latestCompleted && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-slate-900 dark:text-white text-base font-bold tracking-tight uppercase">Recent Results</h3>
              <Link to={`/tournaments/${latestCompleted.id}`} className="text-primary hover:text-accent text-sm font-medium transition-colors">Full Bracket</Link>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">{latestCompleted.name || `BOD #${latestCompleted.bodNumber}`}</div>
              {recentResults.length > 0 ? (
                recentResults.map((match: any) => (
                  <div key={match.id} className="bg-white dark:bg-card-dark rounded-lg p-3 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    {/* Match Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex flex-col items-center gap-1 min-w-[50px]">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{match.round === 'final' ? 'Final' : 'Semi'}</span>
                        <span className="text-xs text-slate-300">Ended</span>
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-white/10"></div>

                      <div className="flex flex-col gap-1 flex-1">
                        {/* Team 1 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-5 rounded-full ${match.team1.score > match.team2.score ? 'bg-primary' : 'bg-gray-600'} flex items-center justify-center text-[10px] text-white`}>
                              {match.team1.teamName?.[0] || 'T'}
                            </div>
                            <span className={`text-sm ${match.team1.score > match.team2.score ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                              {match.team1.teamName || 'Team 1'}
                            </span>
                            {match.team1.score > match.team2.score && <span className="material-symbols-outlined text-accent text-[14px]">check_circle</span>}
                          </div>
                        </div>
                        {/* Team 2 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`size-5 rounded-full ${match.team2.score > match.team1.score ? 'bg-primary' : 'bg-gray-600'} flex items-center justify-center text-[10px] text-white`}>
                              {match.team2.teamName?.[0] || 'T'}
                            </div>
                            <span className={`text-sm ${match.team2.score > match.team1.score ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                              {match.team2.teamName || 'Team 2'}
                            </span>
                            {match.team2.score > match.team1.score && <span className="material-symbols-outlined text-accent text-[14px]">check_circle</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scores Column */}
                    <div className="ml-4 pl-4 border-l border-white/10 flex flex-col justify-center items-end gap-0.5 min-w-[30px]">
                      <span className={`font-mono text-sm ${match.team1.score > match.team2.score ? 'text-accent font-bold' : 'text-slate-500'}`}>{match.team1.score}</span>
                      <span className={`font-mono text-sm ${match.team2.score > match.team1.score ? 'text-accent font-bold' : 'text-slate-500'}`}>{match.team2.score}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-surface-dark/50 rounded-lg text-center text-slate-500 text-sm">
                  No match results available for this tournament yet.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Home;