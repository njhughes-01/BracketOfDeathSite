import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import apiClient from "../services/api";
import Card from "../components/ui/Card"; // Leaving this for now but might replace usage
import LoadingSpinner from "../components/ui/LoadingSpinner";
// import { EditableCard } from '../components/admin'; // Removed in favor of direct styling
import type {
  TournamentInput,
  TournamentSetup,
  SeedingConfig,
  TeamFormationConfig,
  PlayerSeed,
  TeamSeed,
  Player,
} from "../types/api";

interface SetupStep {
  id: string;
  title: string;
  completed: boolean;
  data?: any;
}

const TournamentSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [nextBodNumber, setNextBodNumber] = useState<number | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [generatedSeeds, setGeneratedSeeds] = useState<PlayerSeed[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<TeamSeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [setupData, setSetupData] = useState<TournamentSetup>({
    basicInfo: {
      date: "",
      bodNumber: 0,
      format: "Mixed",
      location: "",
      advancementCriteria: "Top teams advance based on round-robin performance",
      notes: "",
      photoAlbums: "",
      status: "scheduled",
      maxPlayers: 16,
      registrationType: "preselected",
    },
    seedingConfig: {
      method: "historical",
      parameters: {
        championshipWeight: 0.3,
        winPercentageWeight: 0.4,
        avgFinishWeight: 0.3,
        recentTournamentCount: 5,
      },
    },
    teamFormationConfig: {
      method: "manual",
      parameters: {
        skillBalancing: true,
        avoidRecentPartners: false,
        maxTimesPartnered: 3,
      },
    },
    bracketType: "round_robin_playoff",
    maxPlayers: 16,
  });

  const formatOptions = [
    { value: "M", label: "Men's" },
    { value: "W", label: "Women's" },
    { value: "Mixed", label: "Mixed" },
    { value: "Men's Singles", label: "Men's Singles" },
    { value: "Men's Doubles", label: "Men's Doubles" },
    { value: "Women's Doubles", label: "Women's Doubles" },
    { value: "Mixed Doubles", label: "Mixed Doubles" },
  ];

  const steps: SetupStep[] = [
    { id: "basic", title: "Basic Info", completed: false },
    { id: "players", title: "Players", completed: false },
    { id: "seeding", title: "Seeding", completed: false },
    { id: "settings", title: "Settings", completed: false },
    { id: "review", title: "Review", completed: false },
  ];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Get next BOD number
        const bodResponse = await apiClient.getNextBodNumber();
        if (bodResponse.success && bodResponse.data) {
          const nextNumber = bodResponse.data.nextBodNumber;
          setNextBodNumber(nextNumber);
          setSetupData((prev) => ({
            ...prev,
            basicInfo: { ...prev.basicInfo, bodNumber: nextNumber },
          }));
        }

        // Get all players
        const playersResponse = await apiClient.getPlayers({ limit: 1000 });
        if (playersResponse.data) {
          setAvailablePlayers(playersResponse.data);
        }
      } catch (err) {
        setError("Failed to load initial data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const updateBasicInfo = (field: keyof TournamentInput, value: any) => {
    setSetupData((prev) => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, [field]: value },
    }));
  };

  const generateSeeds = async () => {
    if (selectedPlayers.length === 0) {
      setError("Please select players first");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.generatePlayerSeeds(
        setupData.seedingConfig,
      );
      if (response.success && response.data) {
        // Filter seeds to only include selected players
        const filteredSeeds = response.data.filter((seed) =>
          selectedPlayers.includes(seed.playerId),
        );
        setGeneratedSeeds(filteredSeeds);
      }
    } catch (err) {
      setError("Failed to generate player seeds");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateTeams = async () => {
    if (selectedPlayers.length === 0) {
      setError("Please select players first");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.generateTeams(
        selectedPlayers,
        setupData.teamFormationConfig,
      );
      if (response.success && response.data) {
        setGeneratedTeams(response.data);
      }
    } catch (err) {
      setError("Failed to generate teams");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelection = useCallback(
    (playerId: string, selected: boolean) => {
      // Clear any existing error
      setError(null);

      setSelectedPlayers((prev) => {
        if (selected) {
          // Check if player is already selected
          if (prev.includes(playerId)) {
            return prev;
          }

          // Check if we're at the max players limit
          if (prev.length >= setupData.maxPlayers) {
            setError(`Cannot select more than ${setupData.maxPlayers} players`);
            return prev;
          }

          return [...prev, playerId];
        } else {
          return prev.filter((id) => id !== playerId);
        }
      });
    },
    [setupData.maxPlayers],
  );

  const createTournament = async () => {
    try {
      setError(null);
      setLoading(true);

      // Clean up the basic info to remove empty optional fields
      const cleanBasicInfo = { ...setupData.basicInfo };
      if (!cleanBasicInfo.notes || cleanBasicInfo.notes.trim() === "") {
        delete cleanBasicInfo.notes;
      }
      if (
        !cleanBasicInfo.photoAlbums ||
        cleanBasicInfo.photoAlbums.trim() === ""
      ) {
        delete cleanBasicInfo.photoAlbums;
      }

      const cleanSetupData = {
        ...setupData,
        basicInfo: cleanBasicInfo,
        selectedPlayers,
        generatedSeeds,
        generatedTeams,
      };

      console.log("Creating tournament with setup data:", cleanSetupData);
      const response = await apiClient.setupTournament(cleanSetupData);
      if (response.success && response.data) {
        navigate(`/tournaments/${response.data._id || response.data.id}`);
      }
    } catch (err: any) {
      console.error("Tournament creation error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create tournament";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-4">
              Tournament Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={
                    setupData.basicInfo.date instanceof Date
                      ? setupData.basicInfo.date.toISOString().split("T")[0]
                      : setupData.basicInfo.date
                  }
                  onChange={(e) => updateBasicInfo("date", e.target.value)}
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  required
                  data-testid="date-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  BOD Number
                </label>
                <input
                  type="number"
                  value={setupData.basicInfo.bodNumber}
                  onChange={(e) =>
                    updateBasicInfo("bodNumber", parseInt(e.target.value))
                  }
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. 42"
                  min="1"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Auto-generated as #{nextBodNumber} (can be overridden)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Format *
                </label>
                <select
                  value={setupData.basicInfo.format}
                  onChange={(e) => updateBasicInfo("format", e.target.value)}
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                  required
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Max Players
                </label>
                <select
                  value={setupData.maxPlayers}
                  onChange={(e) => {
                    const maxPlayers = parseInt(e.target.value);
                    setSetupData((prev) => ({ ...prev, maxPlayers }));
                    updateBasicInfo("maxPlayers", maxPlayers);
                  }}
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value={8}>8 Players (4 Teams)</option>
                  <option value={16}>16 Players (8 Teams)</option>
                  <option value={32}>32 Players (16 Teams)</option>
                  <option value={64}>64 Players (32 Teams)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Location *
              </label>
              <input
                type="text"
                value={setupData.basicInfo.location}
                onChange={(e) => updateBasicInfo("location", e.target.value)}
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Tournament location"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Advancement Criteria
              </label>
              <textarea
                value={setupData.basicInfo.advancementCriteria}
                onChange={(e) =>
                  updateBasicInfo("advancementCriteria", e.target.value)
                }
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                rows={3}
                placeholder="How players advance through the tournament"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Notes
              </label>
              <textarea
                value={setupData.basicInfo.notes || ""}
                onChange={(e) => updateBasicInfo("notes", e.target.value)}
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                rows={2}
                placeholder="Additional tournament notes"
              />
            </div>

            {/* Registration Type Selection */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                Registration Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateBasicInfo("registrationType", "preselected")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    setupData.basicInfo.registrationType === "preselected"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary">group_add</span>
                    <span className="font-bold text-white">Pre-Selected Players</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    You select players manually in the next step. Use for invite-only tournaments.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => updateBasicInfo("registrationType", "open")}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    setupData.basicInfo.registrationType === "open"
                      ? "border-primary bg-primary/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-green-500">public</span>
                    <span className="font-bold text-white">Open Registration</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Players sign themselves up. Tournament appears in Open Events.
                  </p>
                </button>
              </div>
            </div>
          </div>
        );

      case 1: // Player Selection
        return (
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-2">
              Select Tournament Players
            </h2>
            <div className="flex items-center justify-between bg-background-dark p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-sm text-white font-medium">
                  Select{" "}
                  <span className="text-primary font-bold">
                    {setupData.maxPlayers}
                  </span>{" "}
                  players
                </p>
                <p className="text-xs text-slate-500">
                  Selected: {selectedPlayers.length} / {setupData.maxPlayers}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setError(null);
                    // Sort players by skill level (win percentage * championships + win percentage)
                    const sortedPlayers = [...availablePlayers].sort((a, b) => {
                      const aScore =
                        a.winningPercentage * 100 + a.totalChampionships * 10;
                      const bScore =
                        b.winningPercentage * 100 + b.totalChampionships * 10;
                      return bScore - aScore;
                    });
                    const topPlayers = sortedPlayers.slice(
                      0,
                      setupData.maxPlayers,
                    );
                    setSelectedPlayers(topPlayers.map((p) => p.id));
                  }}
                  className="px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-bold hover:bg-primary hover:text-black transition-all"
                  type="button"
                >
                  Select Top {setupData.maxPlayers}
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setSelectedPlayers([]);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                  type="button"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
              {availablePlayers.map((player) => {
                const isSelected = selectedPlayers.includes(player.id);
                return (
                  <div
                    key={`player-${player.id}`}
                    className={`p-3 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-white/5 bg-background-dark hover:border-white/20"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Manual toggle
                      handlePlayerSelection(player.id, !isSelected);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`size-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-slate-600 bg-transparent"}`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-black text-[16px] font-bold">
                            check
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-bold text-sm truncate ${isSelected ? "text-primary" : "text-white"}`}
                        >
                          {player.name}
                        </p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>Matches: {player.gamesPlayed || 0}</span>
                          <span>
                            WR:{" "}
                            {((player.winningPercentage || 0) * 100).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 2: // Seeding & Teams
        return (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">
                Seeding Configuration
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Seeding Method
                </label>
                <select
                  value={setupData.seedingConfig.method}
                  onChange={(e) =>
                    setSetupData((prev) => ({
                      ...prev,
                      seedingConfig: {
                        ...prev.seedingConfig,
                        method: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="historical">Historical Performance</option>
                  <option value="recent_form">
                    Recent Form (Last 5 tournaments)
                  </option>
                  <option value="elo">ELO Rating System</option>
                  <option value="manual">Manual Seeding</option>
                </select>
              </div>

              {setupData.seedingConfig.method === "historical" && (
                <div className="bg-background-dark p-4 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      Championship Weight
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={
                        setupData.seedingConfig.parameters
                          ?.championshipWeight || 0.3
                      }
                      onChange={(e) =>
                        setSetupData((prev) => ({
                          ...prev,
                          seedingConfig: {
                            ...prev.seedingConfig,
                            parameters: {
                              ...prev.seedingConfig.parameters,
                              championshipWeight: parseFloat(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <span className="text-xs text-primary font-mono">
                      {(
                        (setupData.seedingConfig.parameters
                          ?.championshipWeight || 0.3) * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      Win Percentage Weight
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={
                        setupData.seedingConfig.parameters
                          ?.winPercentageWeight || 0.4
                      }
                      onChange={(e) =>
                        setSetupData((prev) => ({
                          ...prev,
                          seedingConfig: {
                            ...prev.seedingConfig,
                            parameters: {
                              ...prev.seedingConfig.parameters,
                              winPercentageWeight: parseFloat(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <span className="text-xs text-primary font-mono">
                      {(
                        (setupData.seedingConfig.parameters
                          ?.winPercentageWeight || 0.4) * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      Avg Finish Weight
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={
                        setupData.seedingConfig.parameters?.avgFinishWeight ||
                        0.3
                      }
                      onChange={(e) =>
                        setSetupData((prev) => ({
                          ...prev,
                          seedingConfig: {
                            ...prev.seedingConfig,
                            parameters: {
                              ...prev.seedingConfig.parameters,
                              avgFinishWeight: parseFloat(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full accent-primary"
                    />
                    <span className="text-xs text-primary font-mono">
                      {(
                        (setupData.seedingConfig.parameters?.avgFinishWeight ||
                          0.3) * 100
                      ).toFixed(0)}
                      %
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={generateSeeds}
                disabled={loading || selectedPlayers.length === 0}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Player Seeds"}
              </button>

              {generatedSeeds.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Generated Seeds
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {generatedSeeds.map((seed) => (
                      <div
                        key={`seed-${seed.playerId}`}
                        className="flex items-center justify-between p-3 bg-background-dark/50 border border-white/5 rounded-lg"
                      >
                        <span className="text-sm font-bold text-white">
                          <span className="text-primary mr-2">
                            #{seed.seed}
                          </span>{" "}
                          {seed.playerName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {(seed.statistics.winningPercentage * 100).toFixed(0)}
                          % WR
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">
                Team Formation
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Method
                </label>
                <select
                  value={setupData.teamFormationConfig.method}
                  onChange={(e) =>
                    setSetupData((prev) => ({
                      ...prev,
                      teamFormationConfig: {
                        ...prev.teamFormationConfig,
                        method: e.target.value as any,
                      },
                    }))
                  }
                  className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="preformed">Pre-formed Teams</option>
                  <option value="draft">Draft Style (Snake Draft)</option>
                  <option value="statistical_pairing">
                    Statistical Pairing
                  </option>
                  <option value="random">Random Pairing</option>
                  <option value="manual">Manual Assignment</option>
                </select>
              </div>

              {setupData.teamFormationConfig.method ===
                "statistical_pairing" && (
                <div className="space-y-3 bg-background-dark p-4 rounded-xl border border-white/5">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        setupData.teamFormationConfig.parameters
                          ?.skillBalancing || false
                      }
                      onChange={(e) =>
                        setSetupData((prev) => ({
                          ...prev,
                          teamFormationConfig: {
                            ...prev.teamFormationConfig,
                            parameters: {
                              ...prev.teamFormationConfig.parameters,
                              skillBalancing: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="size-5 rounded border-slate-600 bg-transparent text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-white">
                      Balance team skill levels
                    </span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        setupData.teamFormationConfig.parameters
                          ?.avoidRecentPartners || false
                      }
                      onChange={(e) =>
                        setSetupData((prev) => ({
                          ...prev,
                          teamFormationConfig: {
                            ...prev.teamFormationConfig,
                            parameters: {
                              ...prev.teamFormationConfig.parameters,
                              avoidRecentPartners: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="size-5 rounded border-slate-600 bg-transparent text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-white">
                      Avoid recent tournament partners
                    </span>
                  </label>
                </div>
              )}

              <button
                onClick={generateTeams}
                disabled={loading || selectedPlayers.length === 0}
                className="w-full py-3 bg-primary text-black font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Teams"}
              </button>

              {generatedTeams.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Generated Teams
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {generatedTeams.map((team) => (
                      <div
                        key={`team-${team.teamId}`}
                        className="p-3 bg-background-dark border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-white">
                            <span className="text-accent mr-1">
                              #{team.combinedSeed}
                            </span>{" "}
                            {team.teamName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {(
                              team.combinedStatistics?.combinedWinPercentage ||
                              0
                            ).toFixed(0)}
                            % Combo
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {team.players.map((p) => p.playerName).join(" & ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3: // Tournament Settings
        return (
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-white mb-2">
              Tournament Settings
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Bracket Type
              </label>
              <select
                value={setupData.bracketType}
                onChange={(e) =>
                  setSetupData((prev) => ({
                    ...prev,
                    bracketType: e.target.value as any,
                  }))
                }
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin_playoff">
                  Round Robin + Playoffs
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                value={setupData.registrationDeadline || ""}
                onChange={(e) =>
                  setSetupData((prev) => ({
                    ...prev,
                    registrationDeadline: e.target.value,
                  }))
                }
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Initial Status
              </label>
              <select
                value={setupData.basicInfo.status}
                onChange={(e) => updateBasicInfo("status", e.target.value)}
                className="w-full bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="open">Open for Registration</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        );

      case 4: // Review & Create
        return (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">
                Tournament Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Basic Info
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Date</span>
                      <span className="text-white text-sm">
                        {new Date(setupData.basicInfo.date).toLocaleDateString(
                          undefined,
                          { timeZone: "UTC" },
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">BOD</span>
                      <span className="text-white text-sm">
                        #{setupData.basicInfo.bodNumber}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Format</span>
                      <span className="text-white text-sm">
                        {setupData.basicInfo.format}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Players</span>
                      <span className="text-white text-sm">
                        {setupData.maxPlayers}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Configuration
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Seeding</span>
                      <span className="text-white text-sm capitalize">
                        {setupData.seedingConfig.method.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Teams</span>
                      <span className="text-white text-sm capitalize">
                        {setupData.teamFormationConfig.method.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Bracket</span>
                      <span className="text-white text-sm capitalize">
                        {setupData.bracketType.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-slate-400 text-sm">Selected</span>
                      <span className="text-white text-sm">
                        {selectedPlayers.length} Players
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-yellow-500">
                warning
              </span>
              <div>
                <h4 className="font-bold text-yellow-500 text-sm">
                  Ready to Create
                </h4>
                <p className="text-xs text-yellow-500/80 mt-1">
                  Once created, the tournament will be set to{" "}
                  <strong>{setupData.basicInfo.status}</strong>.
                  {setupData.basicInfo.status === "open"
                    ? " Players can immediately start registering."
                    : " You can further manage it in the admin dashboard."}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && currentStep === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark">
        <LoadingSpinner size="lg" />
        <span className="mt-4 text-slate-500 animate-pulse">
          Initializing Setup...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Setup Tournament</h1>
        <button
          onClick={() => navigate("/tournaments")}
          className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Bar */}
        <div className="bg-[#1c2230] rounded-2xl p-4 border border-white/5 overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-[300px]">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-center flex-1 last:flex-none"
              >
                <div
                  className={`relative z-10 size-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${index <= currentStep ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-white/10 text-slate-500"}`}
                >
                  {index < currentStep ? (
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      check
                    </span>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${index < currentStep ? "bg-primary" : "bg-white/5"}`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 min-w-[300px]">
            {steps.map((step, index) => (
              <span
                key={step.id}
                className={`text-[10px] uppercase font-bold transition-colors ${index === currentStep ? "text-primary" : "text-slate-600"}`}
              >
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">
                error
              </span>
              <span className="text-sm text-red-400">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1c2230] border-t border-white/10 p-4 z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <button
              disabled={currentStep === 0}
              onClick={() => {
                // Skip player selection step when going back if open registration
                if (currentStep === 2 && setupData.basicInfo.registrationType === "open") {
                  setCurrentStep(0);
                } else {
                  setCurrentStep((prev) => prev - 1);
                }
              }}
              className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
            >
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  // Validation
                  if (currentStep === 0) {
                    if (!setupData.basicInfo.date) {
                      setError("Date is required");
                      return;
                    }
                    if (!setupData.basicInfo.format) {
                      setError("Format is required");
                      return;
                    }
                    if (!setupData.basicInfo.location) {
                      setError("Location is required");
                      return;
                    }
                    if (
                      !setupData.basicInfo.bodNumber ||
                      setupData.basicInfo.bodNumber <= 0
                    ) {
                      setError("Valid BOD Number is required");
                      return;
                    }
                    // Skip player selection for open registration
                    if (setupData.basicInfo.registrationType === "open") {
                      setError(null);
                      setCurrentStep(2); // Jump to seeding step
                      return;
                    }
                  }
                  if (currentStep === 1 && selectedPlayers.length === 0) {
                    setError("Please select at least one player");
                    return;
                  }

                  setError(null);
                  setCurrentStep((prev) => prev + 1);
                }}
                className="px-8 py-3 rounded-xl bg-primary text-black font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={createTournament}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-neon-accent text-black font-bold shadow-[0_0_20px_rgba(204,255,0,0.4)] hover:shadow-[0_0_30px_rgba(204,255,0,0.6)] hover:scale-105 active:scale-95 transition-all"
              >
                {loading ? "Creating..." : "Create Tournament"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentSetupPage;
