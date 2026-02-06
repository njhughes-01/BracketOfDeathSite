import React, { useState } from "react";
import logger from "../utils/logger";
import { useNavigate } from "react-router-dom";
import { useMutation } from "../hooks/useApi";
import apiClient from "../services/api";
import type { PlayerInput } from "../types/api";

const PlayerCreate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PlayerInput>({
    name: "",
    bodsPlayed: 0,
    bestResult: 0,
    avgFinish: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    winningPercentage: 0,
    individualChampionships: 0,
    divisionChampionships: 0,
    totalChampionships: 0,
    pairing: "",
  });

  const {
    mutate: createPlayer,
    loading,
    error,
  } = useMutation((data: PlayerInput) => apiClient.createPlayer(data), {
    onSuccess: () => navigate("/players"),
    onError: (err) => logger.error("Failed to create player:", err),
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
    createPlayer(formData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/players")}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-white">New Player</h1>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Placeholder */}
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="relative group">
              <div className="size-24 rounded-full bg-[#1c2230] border-2 border-dashed border-white/20 flex items-center justify-center group-hover:border-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">
                  add_a_photo
                </span>
              </div>
              <div className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-black shadow-lg">
                <span className="material-symbols-outlined text-[16px] font-bold">
                  edit
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">Upload profile photo</p>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
              Basic Info
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm text-slate-400 mb-1 ml-1"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="pairing"
                  className="block text-sm text-slate-400 mb-1 ml-1"
                >
                  Usual Partner
                </label>
                <input
                  id="pairing"
                  type="text"
                  name="pairing"
                  value={formData.pairing}
                  onChange={handleChange}
                  placeholder="Optional"
                  className="w-full bg-[#1c2230] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                Initial Stats
              </h3>
              <span className="text-[10px] text-slate-600 italic">
                Optional (Legacy Data)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1c2230] p-3 rounded-xl border border-white/5">
                <label
                  htmlFor="winningPercentage"
                  className="block text-xs text-slate-500 mb-1"
                >
                  Win % (0.00-1.00)
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
                <label
                  htmlFor="totalChampionships"
                  className="block text-xs text-slate-500 mb-1"
                >
                  Total Titles
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
                <label
                  htmlFor="gamesPlayed"
                  className="block text-xs text-slate-500 mb-1"
                >
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
                <label
                  htmlFor="bodsPlayed"
                  className="block text-xs text-slate-500 mb-1"
                >
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
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              Error: {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            {loading ? "Creating..." : "Create Player"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerCreate;
