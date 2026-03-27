import React, { useState, useCallback } from "react";
import logger from "../../utils/logger";
import apiClient from "../../services/api";
import QRScanner from "../../components/scanner/QRScanner";
import ManualLookup from "../../components/scanner/ManualLookup";
import CheckInResult from "../../components/scanner/CheckInResult";
import { Heading, Text, Stack, Container } from "../../components/ui";

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
      setSuccessMessage(`${ticket.player.firstName} ${ticket.player.lastName} checked in successfully!`);

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
  }, []);

  return (
    <Container maxWidth="md" className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <Stack gap={6}>
        {/* Header */}
        <Stack direction="horizontal" justify="between" align="center">
          <div>
            <Heading level={1} className="text-3xl font-black italic text-white tracking-tight uppercase">
              Ticket <span className="text-primary">Scanner</span>
            </Heading>
            <Text color="muted" className="mt-1">
              Scan QR codes or enter ticket codes manually
            </Text>
          </div>
          {scanCount > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-center">
              <span className="text-2xl font-bold text-green-400">{scanCount}</span>
              <Text size="xs" className="text-green-400/80">Checked In</Text>
            </div>
          )}
        </Stack>

        {/* Success message */}
        {successMessage && (
          <Stack direction="horizontal" gap={3} align="center" className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-green-500">check_circle</span>
            <Text color="success" className="font-bold">{successMessage}</Text>
          </Stack>
        )}

        {/* QR Scanner Section */}
        <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
          <Stack direction="horizontal" gap={3} align="center" className="mb-6 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">qr_code_scanner</span>
            </div>
            <div>
              <Heading level={2} className="text-xl font-bold text-white">QR Code Scanner</Heading>
              <Text size="sm" color="muted">Point camera at ticket QR code</Text>
            </div>
          </Stack>

          <QRScanner onScan={lookupTicket} onError={handleScanError} />
        </div>

        {/* Manual Lookup Section */}
        <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
          <Stack direction="horizontal" gap={3} align="center" className="mb-6 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined">keyboard</span>
            </div>
            <div>
              <Heading level={2} className="text-xl font-bold text-white">Manual Entry</Heading>
              <Text size="sm" color="muted">Type ticket code if camera unavailable</Text>
            </div>
          </Stack>

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
          <Stack align="center" justify="center" gap={4} className="bg-[#1c2230] border border-white/5 rounded-2xl p-8 shadow-2xl">
            <span className="loading loading-spinner loading-lg text-primary" />
            <Text color="muted">Looking up ticket...</Text>
          </Stack>
        )}

        {/* Tips */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
          <Heading level={3} className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            Quick Tips
          </Heading>
          <Stack as="ul" gap={1}>
            <Text as="span" size="sm" color="muted" className="text-slate-500">- Hold phone steady 6-12 inches from QR code</Text>
            <Text as="span" size="sm" color="muted" className="text-slate-500">- Ensure good lighting on the ticket</Text>
            <Text as="span" size="sm" color="muted" className="text-slate-500">- Ticket codes follow format: BOD-XXXXXXXX</Text>
            <Text as="span" size="sm" color="muted" className="text-slate-500">- Yellow = already checked in, Green = ready to check in</Text>
          </Stack>
        </div>
      </Stack>
    </Container>
  );
};

export default ScannerPage;
