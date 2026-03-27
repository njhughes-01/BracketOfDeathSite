import React, { useState, useEffect, useCallback } from "react";
import logger from "../utils/logger";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import apiClient from "../services/api";
import Card from "../components/ui/Card";
import {
  Heading,
  Text,
  Button,
  Input,
  Select,
  Textarea,
  FormField,
  Stack,
  Container,
  ResponsiveGrid,
  LoadingSpinner,
} from "../components/ui";
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
        logger.error(err);
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
      logger.error(err);
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
      logger.error(err);
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

      logger.debug("Creating tournament with setup data:", cleanSetupData);
      const response = await apiClient.setupTournament(cleanSetupData);
      if (response.success && response.data) {
        navigate(`/tournaments/${response.data._id || response.data.id}`);
      }
    } catch (err: any) {
      logger.error("Tournament creation error:", err);
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
            <Heading level={2} className="!text-lg mb-4">
              Tournament Details
            </Heading>
            <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap={4}>
              <FormField label="Date" required>
                <Input
                  type="date"
                  value={
                    setupData.basicInfo.date instanceof Date
                      ? setupData.basicInfo.date.toISOString().split("T")[0]
                      : setupData.basicInfo.date
                  }
                  onChange={(e) => updateBasicInfo("date", e.target.value)}
                  required
                  data-testid="date-input"
                />
              </FormField>
              <FormField
                label="BOD Number"
                hint={`Auto-generated as #${nextBodNumber} (can be overridden)`}
              >
                <Input
                  type="number"
                  value={setupData.basicInfo.bodNumber}
                  onChange={(e) =>
                    updateBasicInfo("bodNumber", parseInt(e.target.value))
                  }
                  placeholder="e.g. 42"
                  min="1"
                />
              </FormField>
            </ResponsiveGrid>

            <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap={4}>
              <FormField label="Format" required>
                <Select
                  value={setupData.basicInfo.format}
                  onChange={(e) => updateBasicInfo("format", e.target.value)}
                  required
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Max Players">
                <Select
                  value={setupData.maxPlayers}
                  onChange={(e) => {
                    const maxPlayers = parseInt(e.target.value);
                    setSetupData((prev) => ({ ...prev, maxPlayers }));
                    updateBasicInfo("maxPlayers", maxPlayers);
                  }}
                >
                  <option value={8}>8 Players (4 Teams)</option>
                  <option value={16}>16 Players (8 Teams)</option>
                  <option value={32}>32 Players (16 Teams)</option>
                  <option value={64}>64 Players (32 Teams)</option>
                </Select>
              </FormField>
            </ResponsiveGrid>

            <FormField label="Location" required>
              <Input
                type="text"
                value={setupData.basicInfo.location}
                onChange={(e) => updateBasicInfo("location", e.target.value)}
                placeholder="Tournament location"
                required
              />
            </FormField>

            <FormField label="Advancement Criteria">
              <Textarea
                value={setupData.basicInfo.advancementCriteria}
                onChange={(e) =>
                  updateBasicInfo("advancementCriteria", e.target.value)
                }
                rows={3}
                placeholder="How players advance through the tournament"
              />
            </FormField>

            <FormField label="Notes">
              <Textarea
                value={setupData.basicInfo.notes || ""}
                onChange={(e) => updateBasicInfo("notes", e.target.value)}
                rows={2}
                placeholder="Additional tournament notes"
              />
            </FormField>

            {/* Registration Type Selection - kept as raw buttons for complex selected/unselected state styling */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                Registration Type
              </label>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap={4}>
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
                  <Text size="xs" color="muted">
                    You select players manually in the next step. Use for invite-only tournaments.
                  </Text>
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
                  <Text size="xs" color="muted">
                    Players sign themselves up. Tournament appears in Open Events.
                  </Text>
                </button>
              </ResponsiveGrid>
            </div>
          </div>
        );

      case 1: // Player Selection
        return (
          <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <Heading level={2} className="!text-lg mb-2">
              Select Tournament Players
            </Heading>
            <Stack direction="horizontal" align="center" justify="between" className="bg-background-dark p-4 rounded-xl border border-white/5">
              <div>
                <Text size="sm" color="white" className="font-medium">
                  Select{" "}
                  <span className="text-primary font-bold">
                    {setupData.maxPlayers}
                  </span>{" "}
                  players
                </Text>
                <Text size="xs" color="muted" className="text-slate-500">
                  Selected: {selectedPlayers.length} / {setupData.maxPlayers}
                </Text>
              </div>
              <Stack direction="horizontal" gap={2}>
                <Button
                  variant="secondary"
                  size="sm"
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
                  className="border-primary text-primary hover:bg-primary hover:text-black"
                >
                  Select Top {setupData.maxPlayers}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setSelectedPlayers([]);
                  }}
                >
                  Clear All
                </Button>
              </Stack>
            </Stack>

            {/* Player selection cards - kept as raw divs for specialized checkbox+card behavior */}
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
          <Stack gap={6} className="animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <Heading level={2} className="!text-lg mb-2">
                Seeding Configuration
              </Heading>
              <FormField label="Seeding Method">
                <Select
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
                >
                  <option value="historical">Historical Performance</option>
                  <option value="recent_form">
                    Recent Form (Last 5 tournaments)
                  </option>
                  <option value="elo">ELO Rating System</option>
                  <option value="manual">Manual Seeding</option>
                </Select>
              </FormField>

              {setupData.seedingConfig.method === "historical" && (
                <ResponsiveGrid
                  cols={{ mobile: 1, tablet: 3 }}
                  gap={4}
                  className="bg-background-dark p-4 rounded-xl border border-white/5"
                >
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
                </ResponsiveGrid>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={generateSeeds}
                disabled={loading || selectedPlayers.length === 0}
                loading={loading}
                className="py-3"
              >
                {loading ? "Generating..." : "Generate Player Seeds"}
              </Button>

              {generatedSeeds.length > 0 && (
                <div className="mt-4">
                  <Heading level={4} className="!text-xs !font-bold text-slate-500 uppercase mb-2">
                    Generated Seeds
                  </Heading>
                  <ResponsiveGrid
                    cols={{ mobile: 1, tablet: 2 }}
                    gap={2}
                    className="max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {generatedSeeds.map((seed) => (
                      <Stack
                        key={`seed-${seed.playerId}`}
                        direction="horizontal"
                        align="center"
                        justify="between"
                        className="p-3 bg-background-dark/50 border border-white/5 rounded-lg"
                      >
                        <Text size="sm" color="white" className="font-bold">
                          <span className="text-primary mr-2">
                            #{seed.seed}
                          </span>{" "}
                          {seed.playerName}
                        </Text>
                        <Text size="xs" color="muted" as="span" className="text-[10px] text-slate-500">
                          {(seed.statistics.winningPercentage * 100).toFixed(0)}
                          % WR
                        </Text>
                      </Stack>
                    ))}
                  </ResponsiveGrid>
                </div>
              )}
            </div>

            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <Heading level={2} className="!text-lg mb-2">
                Team Formation
              </Heading>
              <FormField label="Method">
                <Select
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
                >
                  <option value="preformed">Pre-formed Teams</option>
                  <option value="draft">Draft Style (Snake Draft)</option>
                  <option value="statistical_pairing">
                    Statistical Pairing
                  </option>
                  <option value="random">Random Pairing</option>
                  <option value="manual">Manual Assignment</option>
                </Select>
              </FormField>

              {setupData.teamFormationConfig.method ===
                "statistical_pairing" && (
                <Stack gap={3} className="bg-background-dark p-4 rounded-xl border border-white/5">
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
                    <Text size="sm" color="white">
                      Balance team skill levels
                    </Text>
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
                    <Text size="sm" color="white">
                      Avoid recent tournament partners
                    </Text>
                  </label>
                </Stack>
              )}

              <Button
                variant="primary"
                fullWidth
                onClick={generateTeams}
                disabled={loading || selectedPlayers.length === 0}
                loading={loading}
                className="py-3 shadow-lg shadow-primary/20"
              >
                {loading ? "Generating..." : "Generate Teams"}
              </Button>

              {generatedTeams.length > 0 && (
                <div className="mt-4">
                  <Heading level={4} className="!text-xs !font-bold text-slate-500 uppercase mb-2">
                    Generated Teams
                  </Heading>
                  <ResponsiveGrid
                    cols={{ mobile: 1, tablet: 2 }}
                    gap={2}
                    className="max-h-40 overflow-y-auto custom-scrollbar"
                  >
                    {generatedTeams.map((team) => (
                      <div
                        key={`team-${team.teamId}`}
                        className="p-3 bg-background-dark border border-white/10 rounded-lg"
                      >
                        <Stack direction="horizontal" align="center" justify="between" className="mb-1">
                          <Text size="sm" color="white" as="span" className="font-bold">
                            <span className="text-accent mr-1">
                              #{team.combinedSeed}
                            </span>{" "}
                            {team.teamName}
                          </Text>
                          <Text size="xs" color="muted" as="span" className="text-[10px] text-slate-500">
                            {(
                              team.combinedStatistics?.combinedWinPercentage ||
                              0
                            ).toFixed(0)}
                            % Combo
                          </Text>
                        </Stack>
                        <Text size="xs" color="muted">
                          {team.players.map((p) => p.playerName).join(" & ")}
                        </Text>
                      </div>
                    ))}
                  </ResponsiveGrid>
                </div>
              )}
            </div>
          </Stack>
        );

      case 3: // Tournament Settings
        return (
          <Stack gap={4} className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-200">
            <Heading level={2} className="!text-lg mb-2">
              Tournament Settings
            </Heading>
            <FormField label="Bracket Type">
              <Select
                value={setupData.bracketType}
                onChange={(e) =>
                  setSetupData((prev) => ({
                    ...prev,
                    bracketType: e.target.value as any,
                  }))
                }
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="round_robin_playoff">
                  Round Robin + Playoffs
                </option>
              </Select>
            </FormField>

            <FormField label="Registration Deadline">
              <Input
                type="datetime-local"
                value={setupData.registrationDeadline || ""}
                onChange={(e) =>
                  setSetupData((prev) => ({
                    ...prev,
                    registrationDeadline: e.target.value,
                  }))
                }
              />
            </FormField>

            <FormField label="Initial Status">
              <Select
                value={setupData.basicInfo.status}
                onChange={(e) => updateBasicInfo("status", e.target.value)}
              >
                <option value="scheduled">Scheduled</option>
                <option value="open">Open for Registration</option>
                <option value="active">Active</option>
              </Select>
            </FormField>
          </Stack>
        );

      case 4: // Review & Create
        return (
          <Stack gap={6} className="animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#1c2230] p-6 rounded-2xl border border-white/5 space-y-4">
              <Heading level={2} className="!text-lg mb-2">
                Tournament Summary
              </Heading>
              <ResponsiveGrid cols={{ mobile: 1, tablet: 2 }} gap={6}>
                <div>
                  <Heading level={4} className="!text-xs !font-bold text-slate-500 uppercase mb-2">
                    Basic Info
                  </Heading>
                  <Stack gap={2}>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Date</Text>
                      <Text size="sm" color="white">
                        {new Date(setupData.basicInfo.date).toLocaleDateString(
                          undefined,
                          { timeZone: "UTC" },
                        )}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">BOD</Text>
                      <Text size="sm" color="white">
                        #{setupData.basicInfo.bodNumber}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Format</Text>
                      <Text size="sm" color="white">
                        {setupData.basicInfo.format}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Players</Text>
                      <Text size="sm" color="white">
                        {setupData.maxPlayers}
                      </Text>
                    </Stack>
                  </Stack>
                </div>
                <div>
                  <Heading level={4} className="!text-xs !font-bold text-slate-500 uppercase mb-2">
                    Configuration
                  </Heading>
                  <Stack gap={2}>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Seeding</Text>
                      <Text size="sm" color="white" className="capitalize">
                        {setupData.seedingConfig.method.replace("_", " ")}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Teams</Text>
                      <Text size="sm" color="white" className="capitalize">
                        {setupData.teamFormationConfig.method.replace("_", " ")}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Bracket</Text>
                      <Text size="sm" color="white" className="capitalize">
                        {setupData.bracketType.replace("_", " ")}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justify="between" className="border-b border-white/5 pb-1">
                      <Text size="sm" color="muted">Selected</Text>
                      <Text size="sm" color="white">
                        {selectedPlayers.length} Players
                      </Text>
                    </Stack>
                  </Stack>
                </div>
              </ResponsiveGrid>
            </div>

            <Stack direction="horizontal" gap={3} align="start" className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <span className="material-symbols-outlined text-yellow-500">
                warning
              </span>
              <div>
                <Heading level={4} className="!text-sm text-yellow-500">
                  Ready to Create
                </Heading>
                <Text size="xs" className="text-yellow-500/80 mt-1">
                  Once created, the tournament will be set to{" "}
                  <strong>{setupData.basicInfo.status}</strong>.
                  {setupData.basicInfo.status === "open"
                    ? " Players can immediately start registering."
                    : " You can further manage it in the admin dashboard."}
                </Text>
              </div>
            </Stack>
          </Stack>
        );

      default:
        return null;
    }
  };

  if (loading && currentStep === 0) {
    return (
      <Stack align="center" justify="center" className="min-h-screen bg-background-dark">
        <LoadingSpinner size="lg" />
        <Text size="sm" color="muted" className="mt-4 animate-pulse">
          Initializing Setup...
        </Text>
      </Stack>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white pb-24">
      {/* Sticky Header */}
      <Stack direction="horizontal" align="center" justify="between" className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <Heading level={1} className="!text-xl tracking-tight">
          Setup Tournament
        </Heading>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tournaments")}
        >
          Cancel
        </Button>
      </Stack>

      <Container maxWidth="md" padding="none" className="px-4 py-6 space-y-6">
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
          <Stack direction="horizontal" align="center" justify="between" className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
            <Stack direction="horizontal" align="center" gap={3}>
              <span className="material-symbols-outlined text-red-500">
                error
              </span>
              <Text size="sm" color="error">{error}</Text>
            </Stack>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </Button>
          </Stack>
        )}

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Actions - with safe-area handling for iOS, z-50 to be above Layout nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#1c2230] border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-50">
          <Container maxWidth="md" padding="none">
            <Stack direction="horizontal" align="center" justify="between" gap={4}>
              <Button
                variant="secondary"
                size="lg"
                disabled={currentStep === 0}
                onClick={() => {
                  // Skip player selection step when going back if open registration
                  if (currentStep === 2 && setupData.basicInfo.registrationType === "open") {
                    setCurrentStep(0);
                  } else {
                    setCurrentStep((prev) => prev - 1);
                  }
                }}
              >
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  variant="primary"
                  size="lg"
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
                  className="shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  variant="success"
                  size="lg"
                  onClick={createTournament}
                  disabled={loading}
                  loading={loading}
                  className="bg-neon-accent text-black shadow-[0_0_20px_rgba(204,255,0,0.4)] hover:shadow-[0_0_30px_rgba(204,255,0,0.6)] hover:scale-105 active:scale-95"
                >
                  {loading ? "Creating..." : "Create Tournament"}
                </Button>
              )}
            </Stack>
          </Container>
        </div>
      </Container>
    </div>
  );
};

export default TournamentSetupPage;
