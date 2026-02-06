import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logger from "../../utils/logger";
import apiClient from "../../services/api";
import type { StripeSettings, StripeSettingsUpdate } from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const StripeSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StripeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state - Stripe Keys
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  // Form state - Pricing
  const [defaultEntryFee, setDefaultEntryFee] = useState<string>("0");
  const [annualMembershipFee, setAnnualMembershipFee] = useState<string>("0");
  const [monthlyMembershipFee, setMonthlyMembershipFee] = useState<string>("0");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.getStripeSettings();
      const data = response.data as StripeSettings;
      setSettings(data);

      // Set form values from settings
      setPublishableKey(data.stripePublishableKey || "");
      // Convert cents to dollars for display
      setDefaultEntryFee(centsToDisplayDollars(data.defaultEntryFee || 0));
      setAnnualMembershipFee(centsToDisplayDollars(data.annualMembershipFee || 0));
      setMonthlyMembershipFee(centsToDisplayDollars(data.monthlyMembershipFee || 0));
    } catch (err: any) {
      logger.error(err);
      setError(
        err.response?.data?.error ||
          "Failed to load Stripe settings. Ensure you have Super Admin privileges."
      );
    } finally {
      setLoading(false);
    }
  };

  const centsToDisplayDollars = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  const dollarsToCents = (dollars: string): number => {
    const parsed = parseFloat(dollars);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updates: StripeSettingsUpdate = {
        defaultEntryFee: dollarsToCents(defaultEntryFee),
      };

      // Only include key fields if they have values
      if (publishableKey) {
        updates.stripePublishableKey = publishableKey;
      }
      if (secretKey) {
        updates.stripeSecretKey = secretKey;
      }
      if (webhookSecret) {
        updates.stripeWebhookSecret = webhookSecret;
      }

      await apiClient.updateStripeSettings(updates);

      // Clear sensitive input fields after save
      setSecretKey("");
      setWebhookSecret("");

      // Reload settings to get updated status
      await loadSettings();

      setSuccess("Stripe settings saved successfully!");
    } catch (err: any) {
      logger.error(err);
      setError(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-spinner">
        <LoadingSpinner size="lg" color="white" />
      </div>
    );
  }

  const isConfiguredViaEnv = settings?.stripeConfigSource === "environment";
  const isConfiguredViaDb = settings?.stripeConfigSource === "database";
  const isConfigured = settings?.stripeConfigured;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Stripe <span className="text-primary">Settings</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Configure Stripe payment processing and pricing
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

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">
            check_circle
          </span>
          <p className="text-green-500">{success}</p>
        </div>
      )}

      {/* Stripe Connection Section */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
            <span className="material-symbols-outlined">credit_card</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Stripe Connection</h2>
            <p className="text-sm text-slate-400">
              Connect your Stripe account for payment processing
            </p>
          </div>
          {isConfigured ? (
            <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
              Connected
            </span>
          ) : (
            <span className="ml-auto px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded-full border border-yellow-500/20">
              Not Configured
            </span>
          )}
        </div>

        {/* Environment Variables Banner */}
        {isConfiguredViaEnv && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-500 mt-0.5">
              info
            </span>
            <div>
              <p className="text-blue-500 font-bold">
                Configured via Environment Variables
              </p>
              <p className="text-blue-400 text-sm mt-1">
                Stripe is configured using environment variables (.env file). To
                change these settings, update your{" "}
                <code className="bg-blue-500/20 px-1 rounded">
                  STRIPE_SECRET_KEY
                </code>{" "}
                and{" "}
                <code className="bg-blue-500/20 px-1 rounded">
                  STRIPE_PUBLISHABLE_KEY
                </code>{" "}
                in your .env file and restart the server.
              </p>
            </div>
          </div>
        )}

        {/* Configured via Database - Show status */}
        {isConfiguredViaDb && (
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-green-500">
                  check_circle
                </span>
                <div>
                  <p className="font-bold text-white">Stripe Connected</p>
                  <p className="text-sm text-slate-400">
                    API keys are configured and saved
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Publishable Key
                </p>
                <p className="text-white font-mono text-sm truncate">
                  {settings.stripePublishableKey || "Not set"}
                </p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Secret Key
                </p>
                <p className="text-white font-mono text-sm">
                  {settings.hasSecretKey ? "••••••••" : "Not set"}
                </p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Webhook Secret
                </p>
                <p className="text-white font-mono text-sm">
                  {settings.hasWebhookSecret ? "••••••••" : "Not set"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Form - Show when not configured via env */}
        {!isConfiguredViaEnv && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="publishableKey"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Publishable Key
              </label>
              <input
                id="publishableKey"
                type="text"
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_test_..."
                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 font-mono"
              />
              <p className="text-xs text-slate-500">
                Your Stripe publishable key (starts with pk_)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="secretKey"
                  className="text-sm font-bold text-slate-400 uppercase tracking-wider"
                >
                  Secret Key
                </label>
                <input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={
                    settings?.hasSecretKey
                      ? "Leave blank to keep current"
                      : "sk_test_..."
                  }
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 font-mono"
                />
                <p className="text-xs text-slate-500">
                  Your Stripe secret key (starts with sk_)
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="webhookSecret"
                  className="text-sm font-bold text-slate-400 uppercase tracking-wider"
                >
                  Webhook Secret
                </label>
                <input
                  id="webhookSecret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={
                    settings?.hasWebhookSecret
                      ? "Leave blank to keep current"
                      : "whsec_..."
                  }
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 font-mono"
                />
                <p className="text-xs text-slate-500">
                  Webhook signing secret for verifying events
                </p>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Global Pricing Section */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Global Pricing</h2>
            <p className="text-sm text-slate-400">
              Default fees and membership pricing
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Default Entry Fee */}
            <div className="space-y-2">
              <label
                htmlFor="defaultEntryFee"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Default Entry Fee
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  id="defaultEntryFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultEntryFee}
                  onChange={(e) => setDefaultEntryFee(e.target.value)}
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-500">
                Default tournament entry fee (can override per tournament)
              </p>
            </div>

            {/* Annual Membership Fee (Skeleton) */}
            <div className="space-y-2 opacity-50">
              <label
                htmlFor="annualMembershipFee"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Annual Membership Fee
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  id="annualMembershipFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={annualMembershipFee}
                  disabled
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 text-white cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500">Coming soon</p>
            </div>

            {/* Monthly Membership Fee (Skeleton) */}
            <div className="space-y-2 opacity-50">
              <label
                htmlFor="monthlyMembershipFee"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Monthly Membership Fee
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <input
                  id="monthlyMembershipFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyMembershipFee}
                  disabled
                  className="w-full h-12 bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 text-white cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500">Coming soon</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <Link
              to="/admin/settings/discounts"
              className="text-primary hover:text-primary-light flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined">local_offer</span>
              Manage Discount Codes
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="h-12 px-8 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <LoadingSpinner size="sm" color="black" />
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Stripe Dashboard Links */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500">
            <span className="material-symbols-outlined">open_in_new</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Quick Links</h2>
            <p className="text-sm text-slate-400">
              Access Stripe Dashboard directly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-black/20 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-slate-400">
              dashboard
            </span>
            <div>
              <p className="text-white font-bold">Dashboard</p>
              <p className="text-xs text-slate-500">View overview & analytics</p>
            </div>
          </a>

          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-black/20 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-slate-400">
              receipt_long
            </span>
            <div>
              <p className="text-white font-bold">Payments</p>
              <p className="text-xs text-slate-500">View all transactions</p>
            </div>
          </a>

          <a
            href="https://dashboard.stripe.com/webhooks"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-black/20 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-slate-400">
              webhook
            </span>
            <div>
              <p className="text-white font-bold">Webhooks</p>
              <p className="text-xs text-slate-500">Configure event endpoints</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default StripeSettingsPage;
