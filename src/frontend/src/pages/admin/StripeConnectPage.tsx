import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import apiClient from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface ConnectStatus {
  connected: boolean;
  status: string;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  accountName?: string;
  accountEmail?: string;
  platformFeePercent: number;
}

const StripeConnectPage: React.FC = () => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    // Refresh status after onboarding return
    if (searchParams.get("onboarding") === "complete" || searchParams.get("refresh") === "true") {
      loadStatus();
    }
  }, [searchParams]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get<any>("/stripe/connect/status");
      setStatus(response.data?.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load Connect status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError("");
      const response = await apiClient.post<any>("/stripe/connect/onboard", {});
      const data = response.data?.data || response.data;
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start onboarding");
      setConnecting(false);
    }
  };

  const handleDashboard = async () => {
    try {
      setError("");
      const response = await apiClient.get<any>("/stripe/connect/dashboard");
      const data = response.data?.data || response.data;
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to open dashboard");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" color="white" />
      </div>
    );
  }

  const statusColor = {
    active: "green",
    pending: "yellow",
    onboarding_incomplete: "yellow",
    not_connected: "slate",
  }[status?.status || "not_connected"] || "slate";

  const statusLabel = {
    active: "Active",
    pending: "Pending Verification",
    onboarding_incomplete: "Onboarding Incomplete",
    not_connected: "Not Connected",
  }[status?.status || "not_connected"] || "Unknown";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Stripe <span className="text-primary">Connect</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Connect your Stripe account to receive tournament payments
          </p>
        </div>
        <Link
          to="/admin/settings"
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-white">close</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {searchParams.get("onboarding") === "complete" && status?.status === "active" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">check_circle</span>
          <p className="text-green-500">Stripe Connect onboarding completed successfully!</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Connection Status</h2>
            <p className="text-sm text-slate-400">
              Your Stripe Connect account for receiving payments
            </p>
          </div>
          <span className={`ml-auto px-3 py-1 bg-${statusColor}-500/20 text-${statusColor}-500 text-xs font-bold rounded-full border border-${statusColor}-500/20`}>
            {statusLabel}
          </span>
        </div>

        {status?.status === "not_connected" && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">
              link_off
            </span>
            <h3 className="text-xl font-bold text-white mb-2">No Account Connected</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Connect your Stripe account to start receiving tournament registration payments directly to your bank account.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="h-12 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 mx-auto disabled:opacity-50 transition-all"
            >
              {connecting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <span className="material-symbols-outlined">link</span>
                  Connect Stripe Account
                </>
              )}
            </button>
          </div>
        )}

        {status?.status === "onboarding_incomplete" && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-yellow-500 mb-4 block">
              pending
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Onboarding Incomplete</h3>
            <p className="text-slate-400 mb-6">
              You started connecting your account but didn't finish. Click below to continue.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="h-12 px-8 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 mx-auto disabled:opacity-50 transition-all"
            >
              {connecting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <span className="material-symbols-outlined">login</span>
                  Continue Onboarding
                </>
              )}
            </button>
          </div>
        )}

        {status?.status === "pending" && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-6xl text-yellow-500 mb-4 block">
              hourglass_top
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Verification Pending</h3>
            <p className="text-slate-400 mb-4">
              Your account details have been submitted. Stripe is reviewing your information.
            </p>
          </div>
        )}

        {status?.status === "active" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-3xl text-green-500">
                  check_circle
                </span>
                <div>
                  <p className="font-bold text-white">Account Active</p>
                  <p className="text-sm text-slate-400">
                    Your account is ready to receive payments
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Account</p>
                  <p className="text-white text-sm">{status.accountName || status.accountEmail || "Connected"}</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Charges</p>
                  <p className="text-green-500 text-sm font-bold">Enabled</p>
                </div>
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Payouts</p>
                  <p className={`text-sm font-bold ${status.payoutsEnabled ? "text-green-500" : "text-yellow-500"}`}>
                    {status.payoutsEnabled ? "Enabled" : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDashboard}
              className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined">open_in_new</span>
              Open Stripe Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Platform Fee Info (read-only for admins) */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
            <span className="material-symbols-outlined">percent</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Platform Fee</h2>
            <p className="text-sm text-slate-400">
              Current platform fee on tournament payments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-4xl font-black text-white">
            {status?.platformFeePercent || 0}%
          </div>
          <div className="text-slate-400 text-sm">
            {(status?.platformFeePercent || 0) === 0
              ? "You keep 100% of all tournament payments"
              : `Platform keeps ${status?.platformFeePercent}%, you receive ${100 - (status?.platformFeePercent || 0)}%`}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Platform fee is configured by the platform administrator.
        </p>
      </div>
    </div>
  );
};

export default StripeConnectPage;
