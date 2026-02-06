import React, { useState, useCallback } from "react";
import logger from "../../utils/logger";
import apiClient from "../../services/api";
import QRScanner from "../../components/scanner/QRScanner";
import ManualLookup from "../../components/scanner/ManualLookup";
import CheckInResult from "../../components/scanner/CheckInResult";

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

const ScannerPage: React.FC = () => {
  const [ticket, setTicket] = useState<TicketLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const lookupTicket = useCallback(async (code: string) => {
    // Prevent duplicate lookups for same code
    if (code === lastScannedCode && ticket) {
      logger.info("Same code scanned, skipping lookup");
      return;
    }

    setLookupLoading(true);
    setError(null);
    setTicket(null);
    setSuccessMessage(null);
    setLastScannedCode(code);

    try {
      logger.info("Looking up ticket:", code);
      const response = await apiClient.lookupTicketByCode(code);
      
      const result = {
        ...response.data.ticket,
        alreadyCheckedIn: response.data.alreadyCheckedIn,
        canCheckIn: response.data.canCheckIn,
      };
      
      setTicket(result);
      logger.info("Ticket found:", result);
    } catch (err: unknown) {
      logger.error("Ticket lookup failed:", err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMsg = axiosErr.response?.data?.error || axiosErr.message || "Failed to lookup ticket";
      setError(errorMsg);
    } finally {
      setLookupLoading(false);
    }
  }, [lastScannedCode, ticket]);

  const handleCheckIn = useCallback(async () => {
    if (!ticket) return;

    setCheckInLoading(true);
    setError(null);

    try {
      logger.info("Checking in ticket:", ticket.id);
      await apiClient.checkInTicket(ticket.id);
      
      setScanCount((prev) => prev + 1);
      setSuccessMessage(`✅ ${ticket.player.firstName} ${ticket.player.lastName} checked in successfully!`);
      
      // Clear ticket after success (ready for next scan)
      setTimeout(() => {
        setTicket(null);
        setLastScannedCode(null);
        setSuccessMessage(null);
      }, 2000);
    } catch (err: unknown) {
      logger.error("Check-in failed:", err);
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMsg = axiosErr.response?.data?.error || axiosErr.message || "Failed to check in";
      setError(errorMsg);
    } finally {
      setCheckInLoading(false);
    }
  }, [ticket]);

  const handleReset = useCallback(() => {
    setTicket(null);
    setError(null);
    setLastScannedCode(null);
    setSuccessMessage(null);
  }, []);

  const handleScanError = useCallback((err: string) => {
    logger.warn("Scanner error:", err);
    // Don't show camera errors as ticket errors
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Ticket <span className="text-primary">Scanner</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Scan QR codes or enter ticket codes manually
          </p>
        </div>
        {scanCount > 0 && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-center">
            <span className="text-2xl font-bold text-green-400">{scanCount}</span>
            <p className="text-xs text-green-400/80">Checked In</p>
          </div>
        )}
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
          <span className="material-symbols-outlined text-green-500">check_circle</span>
          <p className="text-green-400 font-bold">{successMessage}</p>
        </div>
      )}

      {/* QR Scanner Section */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">qr_code_scanner</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">QR Code Scanner</h2>
            <p className="text-sm text-slate-400">Point camera at ticket QR code</p>
          </div>
        </div>

        <QRScanner onScan={lookupTicket} onError={handleScanError} />
      </div>

      {/* Manual Lookup Section */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
            <span className="material-symbols-outlined">keyboard</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Manual Entry</h2>
            <p className="text-sm text-slate-400">Type ticket code if camera unavailable</p>
          </div>
        </div>

        <ManualLookup onLookup={lookupTicket} loading={lookupLoading} />
      </div>

      {/* Check-in Result Section */}
      {(ticket || error) && (
        <CheckInResult
          ticket={ticket}
          error={error}
          onCheckIn={handleCheckIn}
          onReset={handleReset}
          loading={checkInLoading}
        />
      )}

      {/* Loading state for lookup */}
      {lookupLoading && !ticket && !error && (
        <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-slate-400">Looking up ticket...</p>
        </div>
      )}

      {/* Tips */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">lightbulb</span>
          Quick Tips
        </h3>
        <ul className="text-sm text-slate-500 space-y-1">
          <li>• Hold phone steady 6-12 inches from QR code</li>
          <li>• Ensure good lighting on the ticket</li>
          <li>• Ticket codes follow format: BOD-XXXXXXXX</li>
          <li>• Yellow = already checked in, Green = ready to check in</li>
        </ul>
      </div>
    </div>
  );
};

export default ScannerPage;
