import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import apiClient from "../services/api";
import { LoadingSpinner, Heading, Text, Button, Input, FormField, Stack, Container, ResponsiveGrid } from "../components/ui";
import type { PlayerInput } from "../types/api";

const PlayerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PlayerInput>({
    name: "",
    pairing: "",
    winningPercentage: 0,
    totalChampionships: 0,
    gamesPlayed: 0,
    bodsPlayed: 0,
    isActive: true,
  });

  // Fetch Player Data
  const {
    data: player,
    loading: fetchLoading,
    error: fetchError,
  } = useApi(() => apiClient.getPlayer(id!), { immediate: true });

  // Update Form when data loads
  useEffect(() => {
    if (player) {
      const p = player as any;
      setFormData({
        name: p.name || "",
        pairing: p.pairing || "",
        winningPercentage: p.winningPercentage || 0,
        totalChampionships: p.totalChampionships || 0,
        gamesPlayed: p.gamesPlayed || 0,
        bodsPlayed: p.bodsPlayed || 0,
        isActive: p.isActive !== undefined ? p.isActive : true,
      });
    }
  }, [player]);

  // Mutation for Update
  const {
    mutate: updatePlayer,
    loading: saveLoading,
    error: saveError,
  } = useMutation((data: PlayerInput) => apiClient.updatePlayer(id!, data), {
    onSuccess: () => navigate(`/players/${id}`),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number" ? (value === "" ? 0 : parseFloat(value)) : value,
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
        <Heading level={2} className="!text-xl mb-4">Error loading player</Heading>
        <Button variant="ghost" onClick={() => navigate("/players")}>
          Return to Players
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <Stack direction="horizontal" gap={3} align="center">
          <Button
            variant="ghost"
            onClick={() => navigate(`/players/${id}`)}
            icon="arrow_back"
            className="-ml-2"
          />
          <Heading level={1} className="!text-xl">Edit Player</Heading>
        </Stack>
      </div>

      <Container padding="md" maxWidth="sm" className="flex-1">
        <form onSubmit={handleSubmit}>
          <Stack direction="vertical" gap={6}>
            {/* Basic Info */}
            <div>
              <Text size="xs" className="font-bold text-slate-500 uppercase tracking-wider pl-1 mb-4">
                Basic Info
              </Text>
              <Stack direction="vertical" gap={3}>
                <FormField label="Name">
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </FormField>
                <FormField label="Usual Partner">
                  <Input
                    id="pairing"
                    type="text"
                    name="pairing"
                    value={formData.pairing}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </FormField>
              </Stack>
            </div>

            {/* Status */}
            <div className="bg-[#1c2230] p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <Text size="sm" className="font-bold text-white">Active Status</Text>
                <Text size="xs" color="muted">
                  Inactive players won't appear in selection lists.
                </Text>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={!!formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {/* Stats Overrides */}
            <div>
              <Stack direction="horizontal" align="center" justify="between" className="mb-4">
                <Text size="xs" className="font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Stats Overrides
                </Text>
                <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded">
                  Admin Only
                </span>
              </Stack>

              <ResponsiveGrid cols={{ base: 2 }} gap={3}>
                <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                  <label htmlFor="winningPercentage" className="block text-xs text-slate-500 mb-1">
                    Win %
                  </label>
                  <input
                    id="winningPercentage"
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
                  <label htmlFor="totalChampionships" className="block text-xs text-slate-500 mb-1">
                    Titles
                  </label>
                  <input
                    id="totalChampionships"
                    type="number"
                    name="totalChampionships"
                    value={formData.totalChampionships}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                  />
                </div>
                <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                  <label htmlFor="gamesPlayed" className="block text-xs text-slate-500 mb-1">
                    Games Played
                  </label>
                  <input
                    id="gamesPlayed"
                    type="number"
                    name="gamesPlayed"
                    value={formData.gamesPlayed}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                  />
                </div>
                <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                  <label htmlFor="bodsPlayed" className="block text-xs text-slate-500 mb-1">
                    BODs Played
                  </label>
                  <input
                    id="bodsPlayed"
                    type="number"
                    name="bodsPlayed"
                    value={formData.bodsPlayed}
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-transparent border-none p-0 text-white font-mono text-lg focus:ring-0"
                  />
                </div>
              </ResponsiveGrid>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                Error saving: {saveError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={saveLoading || !formData.name}
              className="py-4 text-lg shadow-lg shadow-primary/20"
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </form>
      </Container>
    </div>
  );
};

export default PlayerEdit;
