import React from "react";

interface TicketLookupResult {
  id: string;
  ticketCode: string;
  status: "valid" | "checked_in" | "refunded" | "void";
  player: {
    id: string;
    firstName: string;
    lastName: string;
  };
  team?: {
    id: string;
    name: string;
  };
  tournament: {
    id: string;
    name: string;
  };
  checkedInAt?: string;
  checkedInBy?: {
    id: string;
    name: string;
  };
  alreadyCheckedIn?: boolean;
  canCheckIn?: boolean;
  error?: string;
}

interface Props {
  ticket: TicketLookupResult | null;
  error?: string | null;
  onCheckIn: () => void;
  onReset: () => void;
  loading?: boolean;
}

export const CheckInResult: React.FC<Props> = ({
  ticket,
  error,
  onCheckIn,
  onReset,
  loading = false,
}) => {
  // Error state (invalid ticket or API error)
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-red-500">error</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-400">Invalid Ticket</h3>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          Scan Another Ticket
        </button>
      </div>
    );
  }

  // No result yet
  if (!ticket) {
    return null;
  }

  // Already checked in state
  if (ticket.alreadyCheckedIn || ticket.status === "checked_in") {
    const checkedInDate = ticket.checkedInAt
      ? new Date(ticket.checkedInAt).toLocaleString()
      : "Unknown time";

    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-yellow-500">warning</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-yellow-400">Already Checked In</h3>
            <p className="text-sm text-yellow-400/80">This ticket has already been used</p>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Player</span>
            <span className="text-white font-bold">
              {ticket.player.firstName} {ticket.player.lastName}
            </span>
          </div>
          {ticket.team && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Team</span>
              <span className="text-white">{ticket.team.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Tournament</span>
            <span className="text-white">{ticket.tournament.name}</span>
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
            <span className="text-slate-400 text-sm">Checked in at</span>
            <span className="text-yellow-400 font-mono text-sm">{checkedInDate}</span>
          </div>
          {ticket.checkedInBy && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">By</span>
              <span className="text-slate-300 text-sm">{ticket.checkedInBy.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Ticket Code</span>
            <span className="text-slate-400 font-mono text-xs">{ticket.ticketCode}</span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          Scan Another Ticket
        </button>
      </div>
    );
  }

  // Refunded or void ticket
  if (ticket.status === "refunded" || ticket.status === "void") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-red-500">block</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-400">
              {ticket.status === "refunded" ? "Ticket Refunded" : "Ticket Voided"}
            </h3>
            <p className="text-sm text-red-400/80">This ticket is no longer valid</p>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Player</span>
            <span className="text-white">
              {ticket.player.firstName} {ticket.player.lastName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Ticket Code</span>
            <span className="text-slate-400 font-mono text-xs">{ticket.ticketCode}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Status</span>
            <span className="text-red-400 uppercase text-xs font-bold">{ticket.status}</span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          Scan Another Ticket
        </button>
      </div>
    );
  }

  // Valid ticket - ready to check in
  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl text-green-500">verified</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-green-400">Valid Ticket</h3>
          <p className="text-sm text-green-400/80">Ready to check in</p>
        </div>
      </div>

      <div className="bg-black/20 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Player</span>
          <span className="text-white text-lg font-bold">
            {ticket.player.firstName} {ticket.player.lastName}
          </span>
        </div>
        {ticket.team && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Team</span>
            <span className="text-primary font-bold">{ticket.team.name}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Tournament</span>
          <span className="text-white">{ticket.tournament.name}</span>
        </div>
        <div className="flex justify-between items-center border-t border-white/10 pt-2">
          <span className="text-slate-400 text-sm">Ticket Code</span>
          <span className="text-slate-300 font-mono text-sm">{ticket.ticketCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReset}
          disabled={loading}
          className="h-14 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined">close</span>
          Cancel
        </button>
        <button
          onClick={onCheckIn}
          disabled={loading || !ticket.canCheckIn}
          className="h-14 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Checking in...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">check_circle</span>
              Check In
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CheckInResult;
