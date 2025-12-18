import React from 'react';

interface Props {
  matchCount: number;
  compactListView: boolean;
  onToggleCompact: (v: boolean) => void;
  requirePerPlayerScores: boolean;
  onToggleRequirePerPlayer: (v: boolean) => void;
  strictTotals: boolean;
  onToggleStrictTotals: (v: boolean) => void;
  canConfirmAll: boolean;
  onConfirmAll: () => void;
  loading?: boolean;
}

const MatchesToolbar: React.FC<Props> = ({
  matchCount,
  compactListView,
  onToggleCompact,
  requirePerPlayerScores,
  onToggleRequirePerPlayer,
  strictTotals,
  onToggleStrictTotals,
  canConfirmAll,
  onConfirmAll,
  loading = false,
}) => {
  return (
    <div className="flex items-center justify-between mb-2 text-white">
      <div className="text-sm text-slate-400">
        {matchCount} match{matchCount === 1 ? '' : 'es'} in this round
      </div>
      <div className="flex items-center space-x-3">
        <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={compactListView}
            onChange={(e) => onToggleCompact(e.target.checked)}
            className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
          />
          <span>List View</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={requirePerPlayerScores}
            onChange={(e) => onToggleRequirePerPlayer(e.target.checked)}
            className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
          />
          <span>Require Per-Player</span>
        </label>
        <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={strictTotals}
            onChange={(e) => onToggleStrictTotals(e.target.checked)}
            className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
          />
          <span>Lock Totals</span>
        </label>
        {canConfirmAll && (
          <button
            onClick={onConfirmAll}
            className="btn btn-xs btn-primary shadow-lg shadow-primary/20"
            disabled={loading}
            title="Confirm all completed matches in this round"
          >
            Confirm All Completed
          </button>
        )}
      </div>
    </div>
  );
};

export default MatchesToolbar;

