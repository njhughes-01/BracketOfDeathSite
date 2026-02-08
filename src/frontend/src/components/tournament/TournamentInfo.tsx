import React from "react";
import type { Tournament, TournamentResult, Player } from "../../types/api";

interface TournamentStatsData {
  totalTeams: number;
  totalGames: number;
  rrGames: number;
  bracketGames: number;
  totalWins: number;
  avgWinPct: number;
  highestScorer: TournamentResult | null;
}

interface TournamentInfoProps {
  tournament: Tournament;
  champion: TournamentResult | Tournament["champion"] | null;
  finalist: TournamentResult | null;
  finalMatchScore: { champion: number; finalist: number } | null;
  tournamentStats: TournamentStatsData | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
  isAdmin: boolean;
}

const TournamentInfo: React.FC<TournamentInfoProps> = ({
  tournament,
  champion,
  finalist,
  finalMatchScore,
  tournamentStats,
  status,
  isAdmin,
}) => {
  return (
    <div className="space-y-6">
      {/* Champion & Finalist Section */}
      {champion && status === "completed" && (
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-2xl p-6 border border-yellow-500/20 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-yellow-500 text-2xl">
              emoji_events
            </span>
            <h3 className="text-white font-bold text-lg">
              Final Results
            </h3>
          </div>

          {/* Champion and Finalist Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Champion */}
            <div className="bg-black/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-lg shadow-lg shadow-yellow-500/30">
                  🏆
                </div>
                <div>
                  <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-bold">
                    Champion
                  </p>
                  <p className="text-white font-bold">
                    {"players" in champion &&
                      Array.isArray(
                        (champion as TournamentResult).players,
                      )
                      ? (champion as TournamentResult).players
                        .map((p: Player | string | { _id?: string; name?: string }) =>
                          typeof p === "object" && "name" in p
                            ? p.name
                            : p,
                        )
                        .join(" & ")
                      : "playerName" in champion
                        ? (champion as { playerName?: string })
                          .playerName
                        : "Champion"}
                  </p>
                </div>
              </div>
              {"totalStats" in champion && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-black/30 rounded-lg p-2">
                    <p className="text-yellow-500 font-bold">
                      {(champion as TournamentResult).totalStats
                        ?.totalWon || 0}
                      -
                      {(champion as TournamentResult).totalStats
                        ?.totalLost || 0}
                    </p>
                    <p className="text-slate-500 text-[10px] uppercase">
                      Total
                    </p>
                  </div>
                  {"roundRobinScores" in champion && (
                    <div className="bg-black/30 rounded-lg p-2">
                      <p className="text-blue-400 font-bold">
                        {(champion as TournamentResult).roundRobinScores
                          ?.rrWon || 0}
                        -
                        {(champion as TournamentResult).roundRobinScores
                          ?.rrLost || 0}
                      </p>
                      <p className="text-slate-500 text-[10px] uppercase">
                        RR
                      </p>
                    </div>
                  )}
                  {"bracketScores" in champion && (
                    <div className="bg-black/30 rounded-lg p-2">
                      <p className="text-purple-400 font-bold">
                        {(champion as TournamentResult).bracketScores
                          ?.bracketWon || 0}
                        -
                        {(champion as TournamentResult).bracketScores
                          ?.bracketLost || 0}
                      </p>
                      <p className="text-slate-500 text-[10px] uppercase">
                        Bracket
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Champion Suffering Score */}
              {tournament.championSufferingScore !== undefined &&
                tournament.championSufferingScore !== null && (
                  <div className="mt-2 text-center">
                    <span className="text-[10px] text-yellow-500/70 uppercase tracking-wider font-bold">
                      Suffering Score:{" "}
                    </span>
                    <span className="text-yellow-400 font-bold text-sm">
                      {tournament.championSufferingScore.toFixed(2)}
                    </span>
                  </div>
                )}
            </div>

            {/* Finalist */}
            {finalist && (
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                    🥈
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Finalist
                    </p>
                    <p className="text-white font-bold">
                      {finalist.players &&
                        Array.isArray(finalist.players)
                        ? finalist.players
                          .map((p: Player | string | { _id?: string; name?: string }) =>
                            typeof p === "object" && "name" in p
                              ? p.name
                              : p,
                          )
                          .join(" & ")
                        : "Finalist"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-black/30 rounded-lg p-2">
                    <p className="text-slate-300 font-bold">
                      {finalist.totalStats?.totalWon || 0}-
                      {finalist.totalStats?.totalLost || 0}
                    </p>
                    <p className="text-slate-500 text-[10px] uppercase">
                      Total
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <p className="text-blue-400 font-bold">
                      {finalist.roundRobinScores?.rrWon || 0}-
                      {finalist.roundRobinScores?.rrLost || 0}
                    </p>
                    <p className="text-slate-500 text-[10px] uppercase">
                      RR
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2">
                    <p className="text-purple-400 font-bold">
                      {finalist.bracketScores?.bracketWon || 0}-
                      {finalist.bracketScores?.bracketLost || 0}
                    </p>
                    <p className="text-slate-500 text-[10px] uppercase">
                      Bracket
                    </p>
                  </div>
                </div>
                {/* Finalist Suffering Score */}
                {tournament.finalistSufferingScore !== undefined &&
                  tournament.finalistSufferingScore !== null && (
                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-slate-400/70 uppercase tracking-wider font-bold">
                        Suffering Score:{" "}
                      </span>
                      <span className="text-slate-400 font-bold text-sm">
                        {tournament.finalistSufferingScore.toFixed(2)}
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Final Match Score */}
          {finalMatchScore && (
            <div className="mt-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
                Final Match
              </p>
              <div className="inline-flex items-center gap-3 bg-black/30 rounded-xl px-6 py-3">
                <span className="text-yellow-500 font-bold text-2xl">
                  {finalMatchScore.champion}
                </span>
                <span className="text-slate-500 text-lg">-</span>
                <span className="text-slate-400 font-bold text-2xl">
                  {finalMatchScore.finalist}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tournament Statistics Section */}
      {tournamentStats && (
        <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">
              analytics
            </span>
            <h3 className="text-white font-bold text-lg">
              Tournament Statistics
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-background-dark rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {tournamentStats.totalTeams}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Teams
              </p>
            </div>
            <div className="bg-background-dark rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {tournamentStats.totalGames}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Total Games
              </p>
            </div>
            <div className="bg-background-dark rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {tournamentStats.rrGames}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Round Robin
              </p>
            </div>
            <div className="bg-background-dark rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {tournamentStats.bracketGames}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Bracket Games
              </p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background-dark rounded-lg p-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                Average Win Rate
              </span>
              <span className="text-white text-lg font-bold">
                {(tournamentStats.avgWinPct * 100).toFixed(1)}%
              </span>
            </div>
            {tournamentStats.highestScorer && (
              <div className="bg-background-dark rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Most Wins
                </span>
                <span className="text-white text-sm font-medium">
                  {tournamentStats.highestScorer.players &&
                    Array.isArray(tournamentStats.highestScorer.players)
                    ? tournamentStats.highestScorer.players
                      .map((p: Player | string | { _id?: string; name?: string }) =>
                        typeof p === "object" && "name" in p
                          ? p.name
                          : p,
                      )
                      .join(" & ")
                    : "Team"}{" "}
                  <span className="text-primary">
                    (
                    {tournamentStats.highestScorer.totalStats
                      ?.totalWon || 0}{" "}
                    wins)
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Historical Tournament Statistics (from Excel) */}
          {(tournament.tiebreakers !== undefined ||
            tournament.avgGames !== undefined ||
            tournament.avgRRGames !== undefined) && (
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/10">
                {tournament.tiebreakers !== undefined &&
                  tournament.tiebreakers !== null && (
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-400">
                        {tournament.tiebreakers}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Tiebreakers
                      </p>
                    </div>
                  )}
                {tournament.avgGames !== undefined &&
                  tournament.avgGames !== null && (
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-emerald-400">
                        {tournament.avgGames.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Avg Games/Team
                      </p>
                    </div>
                  )}
                {tournament.avgRRGames !== undefined &&
                  tournament.avgRRGames !== null && (
                    <div className="bg-background-dark rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-cyan-400">
                        {tournament.avgRRGames.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Avg RR Games
                      </p>
                    </div>
                  )}
              </div>
            )}
        </div>
      )}

      {/* Tournament Info Section */}
      {(tournament.location ||
        tournament.notes ||
        tournament.photoAlbums ||
        tournament.advancementCriteria) && (
          <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">
                info
              </span>
              <h3 className="text-white font-bold text-lg">
                Tournament Info
              </h3>
            </div>
            <div className="space-y-4">
              {/* Location */}
              {tournament.location && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                    location_on
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Location
                    </p>
                    <p className="text-white">{tournament.location}</p>
                  </div>
                </div>
              )}

              {/* Advancement Criteria */}
              {tournament.advancementCriteria && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                    emoji_events
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Advancement Criteria
                    </p>
                    <p className="text-white text-sm">
                      {tournament.advancementCriteria}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {tournament.notes && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                    notes
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Notes
                    </p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                      {tournament.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Photo Albums */}
              {tournament.photoAlbums && (
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">
                    photo_library
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                      Photo Album
                    </p>
                    <a
                      href={tournament.photoAlbums}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-light underline text-sm inline-flex items-center gap-1"
                    >
                      View Photos
                      <span className="material-symbols-outlined text-sm">
                        open_in_new
                      </span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* About Section */}
      <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
        <h3 className="text-white font-bold text-lg mb-3">
          Tournament Details
        </h3>
        <div className="space-y-4">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {tournament.bracketType && (
              <div className="bg-background-dark rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Bracket Type
                </span>
                <span className="text-white text-sm font-medium capitalize">
                  {tournament.bracketType.replace(/_/g, " ")}
                </span>
              </div>
            )}
            {tournament.season && (
              <div className="bg-background-dark rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Season
                </span>
                <span className="text-white text-sm font-medium">
                  {tournament.season}
                </span>
              </div>
            )}
            {tournament.registrationType && (
              <div className="bg-background-dark rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Registration
                </span>
                <span className="text-white text-sm font-medium capitalize">
                  {tournament.registrationType}
                </span>
              </div>
            )}
            {tournament.registrationStatus && (
              <div className="bg-background-dark rounded-lg p-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Reg. Status
                </span>
                <span
                  className={`text-sm font-medium capitalize ${tournament.registrationStatus === "open"
                    ? "text-green-400"
                    : tournament.registrationStatus === "full"
                      ? "text-red-400"
                      : tournament.registrationStatus === "closed"
                        ? "text-slate-400"
                        : "text-yellow-400"
                    }`}
                >
                  {tournament.registrationStatus}
                </span>
              </div>
            )}
          </div>

          {/* Registration Dates */}
          {(tournament.registrationOpensAt ||
            tournament.registrationDeadline) && (
              <>
                <div className="h-px bg-white/5"></div>
                <div className="grid grid-cols-2 gap-3">
                  {tournament.registrationOpensAt && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                        Registration Opens
                      </span>
                      <span className="text-slate-300 text-sm">
                        {new Date(
                          tournament.registrationOpensAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {tournament.registrationDeadline && (
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                        Registration Deadline
                      </span>
                      <span className="text-slate-300 text-sm">
                        {new Date(
                          tournament.registrationDeadline,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

          <div className="h-px bg-white/5"></div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
              Description
            </span>
            <p className="text-slate-300 text-sm leading-relaxed">
              {tournament.notes ||
                "No specific notes provided for this tournament."}
            </p>
          </div>
          <div className="h-px bg-white/5"></div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
              Rules
            </span>
            <p className="text-slate-300 text-sm leading-relaxed">
              {tournament.advancementCriteria ||
                "Standard tournament rules apply."}
            </p>
          </div>
          {tournament.photoAlbums && (
            <>
              <div className="h-px bg-white/5"></div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
                  Photo Albums
                </span>
                <a
                  href={tournament.photoAlbums}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline flex items-center gap-1"
                >
                  View Photos
                  <span className="material-symbols-outlined text-[16px]">
                    open_in_new
                  </span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Admin Configuration Section - Only visible to admins */}
      {isAdmin &&
        (tournament.seedingConfig ||
          tournament.teamFormationConfig ||
          tournament.managementState) && (
          <div className="bg-[#1c2230] rounded-2xl p-6 border border-white/5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">
                admin_panel_settings
              </span>
              <h3 className="text-white font-bold text-lg">
                Configuration
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/20 text-primary">
                Admin Only
              </span>
            </div>
            <div className="space-y-4">
              {/* Seeding Configuration */}
              {tournament.seedingConfig && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                    Seeding Method
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background-dark rounded-lg p-3">
                      <span className="text-slate-400 text-xs block mb-1">
                        Method
                      </span>
                      <span className="text-white text-sm font-medium capitalize">
                        {tournament.seedingConfig.method?.replace(
                          /_/g,
                          " ",
                        ) || "Not set"}
                      </span>
                    </div>
                    {tournament.seedingConfig.parameters && (
                      <>
                        {tournament.seedingConfig.parameters
                          .recentTournamentCount !== undefined && (
                            <div className="bg-background-dark rounded-lg p-3">
                              <span className="text-slate-400 text-xs block mb-1">
                                Recent Tournaments
                              </span>
                              <span className="text-white text-sm font-medium">
                                {
                                  tournament.seedingConfig.parameters
                                    .recentTournamentCount
                                }
                              </span>
                            </div>
                          )}
                        {tournament.seedingConfig.parameters
                          .championshipWeight !== undefined && (
                            <div className="bg-background-dark rounded-lg p-3">
                              <span className="text-slate-400 text-xs block mb-1">
                                Championship Weight
                              </span>
                              <span className="text-white text-sm font-medium">
                                {
                                  tournament.seedingConfig.parameters
                                    .championshipWeight
                                }
                              </span>
                            </div>
                          )}
                        {tournament.seedingConfig.parameters
                          .winPercentageWeight !== undefined && (
                            <div className="bg-background-dark rounded-lg p-3">
                              <span className="text-slate-400 text-xs block mb-1">
                                Win % Weight
                              </span>
                              <span className="text-white text-sm font-medium">
                                {
                                  tournament.seedingConfig.parameters
                                    .winPercentageWeight
                                }
                              </span>
                            </div>
                          )}
                        {tournament.seedingConfig.parameters
                          .avgFinishWeight !== undefined && (
                            <div className="bg-background-dark rounded-lg p-3">
                              <span className="text-slate-400 text-xs block mb-1">
                                Avg Finish Weight
                              </span>
                              <span className="text-white text-sm font-medium">
                                {
                                  tournament.seedingConfig.parameters
                                    .avgFinishWeight
                                }
                              </span>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Team Formation Configuration */}
              {tournament.teamFormationConfig && (
                <>
                  <div className="h-px bg-white/5"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                      Team Formation
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background-dark rounded-lg p-3">
                        <span className="text-slate-400 text-xs block mb-1">
                          Method
                        </span>
                        <span className="text-white text-sm font-medium capitalize">
                          {tournament.teamFormationConfig.method?.replace(
                            /_/g,
                            " ",
                          ) || "Not set"}
                        </span>
                      </div>
                      {tournament.teamFormationConfig.parameters && (
                        <>
                          {tournament.teamFormationConfig.parameters
                            .skillBalancing !== undefined && (
                              <div className="bg-background-dark rounded-lg p-3">
                                <span className="text-slate-400 text-xs block mb-1">
                                  Skill Balancing
                                </span>
                                <span
                                  className={`text-sm font-medium ${tournament.teamFormationConfig.parameters.skillBalancing ? "text-green-400" : "text-slate-400"}`}
                                >
                                  {tournament.teamFormationConfig
                                    .parameters.skillBalancing
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                              </div>
                            )}
                          {tournament.teamFormationConfig.parameters
                            .avoidRecentPartners !== undefined && (
                              <div className="bg-background-dark rounded-lg p-3">
                                <span className="text-slate-400 text-xs block mb-1">
                                  Avoid Recent Partners
                                </span>
                                <span
                                  className={`text-sm font-medium ${tournament.teamFormationConfig.parameters.avoidRecentPartners ? "text-green-400" : "text-slate-400"}`}
                                >
                                  {tournament.teamFormationConfig
                                    .parameters.avoidRecentPartners
                                    ? "Yes"
                                    : "No"}
                                </span>
                              </div>
                            )}
                          {tournament.teamFormationConfig.parameters
                            .maxTimesPartnered !== undefined && (
                              <div className="bg-background-dark rounded-lg p-3">
                                <span className="text-slate-400 text-xs block mb-1">
                                  Max Times Partnered
                                </span>
                                <span className="text-white text-sm font-medium">
                                  {
                                    tournament.teamFormationConfig
                                      .parameters.maxTimesPartnered
                                  }
                                </span>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Management State */}
              {tournament.managementState?.currentRound && (
                <>
                  <div className="h-px bg-white/5"></div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-2">
                      Management State
                    </span>
                    <div className="bg-background-dark rounded-lg p-3 inline-block">
                      <span className="text-slate-400 text-xs block mb-1">
                        Current Round
                      </span>
                      <span className="text-primary text-sm font-bold uppercase">
                        {tournament.managementState.currentRound.replace(
                          /_/g,
                          " ",
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

export default TournamentInfo;
