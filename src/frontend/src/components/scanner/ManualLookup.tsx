import React, { useState } from "react";

interface Props {
  onLookup: (code: string) => void;
  loading?: boolean;
}

export const ManualLookup: React.FC<Props> = ({ onLookup, loading = false }) => {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode) {
      onLookup(trimmedCode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block">
        Manual Ticket Code Entry
      </label>
      
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            confirmation_number
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Enter ticket code (e.g., BOD-A1B2C3D4)"
            disabled={loading}
            className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 text-white font-mono text-lg tracking-wider focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal disabled:opacity-50"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
        
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Looking up...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">search</span>
              Lookup
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-slate-500">
        Enter the ticket code manually if QR scanning isn't working
      </p>
    </div>
  );
};

export default ManualLookup;
