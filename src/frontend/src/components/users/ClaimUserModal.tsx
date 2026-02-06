import logger from "../../utils/logger";
import React, { useState } from "react";
import apiClient from "../../services/api";
import LoadingSpinner from "../ui/LoadingSpinner";
import type { Player } from "../../types/api";

interface ClaimUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ClaimUserModal: React.FC<ClaimUserModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");

  const searchPlayers = async (query: string) => {
    if (!query || query.length < 2) return;
    try {
      setSearching(true);
      const res = await apiClient.searchPlayers(query);
      if (res.success && res.data) {
        setPlayers(res.data);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !selectedPlayer) {
      setError("Please provide an email and select a player");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await apiClient.claimUser(email, selectedPlayer.id);

      if (res.success) {
        setStep(2);
      } else {
        setError(res.error || "Failed to send invitation");
      }
    } catch (err: any) {
      logger.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
        <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-500 text-3xl">
                mark_email_read
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Invitation Sent!
            </h3>
            <p className="text-slate-400 mb-6">
              An email has been sent to <strong>{email}</strong> with
              instructions to claim the profile for{" "}
              <strong>{selectedPlayer?.name}</strong>.
            </p>
            <button
              onClick={onSuccess}
              className="px-6 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-white transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-bold text-white mb-1">Claim Profile</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Invite a user to claim an existing player profile.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">
              error
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-400 ml-1">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-400 ml-1">
              SELECT PLAYER
            </label>
            {selectedPlayer ? (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {selectedPlayer.name.charAt(0)}
                  </div>
                  <span className="text-white font-bold">
                    {selectedPlayer.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined">
                  search
                </span>
                <input
                  type="text"
                  onChange={(e) => searchPlayers(e.target.value)}
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  placeholder="Search player name..."
                />

                {players.length > 0 && !selectedPlayer && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#161b26] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto z-10">
                    {players.map((player) => (
                      <button
                        key={player._id || player.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlayer(player);
                          setPlayers([]);
                        }}
                        className="w-full text-left p-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs">
                          {player.name.charAt(0)}
                        </div>
                        <span className="text-white">{player.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email || !selectedPlayer}
            className="mt-4 w-full h-12 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="black" />
            ) : (
              <>
                <span className="material-symbols-outlined">send</span> Send
                Invitation
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClaimUserModal;
