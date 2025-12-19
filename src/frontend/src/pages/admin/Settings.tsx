import React, { useEffect, useState } from 'react';
import apiClient from '../../services/api';
import type { SystemSettings } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [testEmailAddress, setTestEmailAddress] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getSystemSettings();
            setSettings(data);
            setSenderEmail(data.mailjetSenderEmail);
            // Don't set keys, they are hidden
        } catch (err: any) {
            console.error(err);
            setError('Failed to load settings. Ensure you have Super Admin privileges.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError('');
            setSuccess('');

            await apiClient.updateSystemSettings({
                mailjetApiKey: apiKey || undefined, // Only send if changed (non-empty)
                mailjetApiSecret: apiSecret || undefined,
                mailjetSenderEmail: senderEmail
            });

            setSuccess('Settings saved successfully!');
            // Reload to update "hasApiKey" indicators
            await loadSettings();
            // Clear inputs for security
            setApiKey('');
            setApiSecret('');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailAddress) {
            setError('Please enter an email address to send a test to');
            return;
        }
        try {
            setTesting(true);
            setError('');
            setSuccess('');
            await apiClient.testEmail(testEmailAddress);
            setSuccess('Test email sent successfully! Check your inbox.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send test email');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" color="white" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
                        System <span className="text-primary">Settings</span>
                    </h1>
                    <p className="text-slate-400 mt-2">Manage global system configurations and integrations</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-red-500">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <p className="text-green-500">{success}</p>
                </div>
            )}

            <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Mailjet Configuration</h2>
                        <p className="text-sm text-slate-400">Configure email delivery settings for invitations and alerts</p>
                    </div>
                    {settings?.mailjetConfigured ? (
                        <span className="ml-auto px-3 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
                            Active
                        </span>
                    ) : (
                        <span className="ml-auto px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded-full border border-yellow-500/20">
                            Not Configured
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={settings?.hasApiKey ? "•••••••••••••••• (Unchanged)" : "Enter Mailjet API Key"}
                                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                API Secret
                            </label>
                            <input
                                type="password"
                                value={apiSecret}
                                onChange={(e) => setApiSecret(e.target.value)}
                                placeholder={settings?.hasApiSecret ? "•••••••••••••••• (Unchanged)" : "Enter Mailjet API Secret"}
                                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                Sender Email Address
                            </label>
                            <input
                                type="email"
                                value={senderEmail}
                                onChange={(e) => setSenderEmail(e.target.value)}
                                placeholder="noreply@yourdomain.com"
                                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                            />
                            <p className="text-xs text-slate-500">
                                This email must be verified in your Mailjet account.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
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

                {/* Test Email Section */}
                {settings?.mailjetConfigured && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <h3 className="text-lg font-bold text-white mb-4">Test Email Configuration</h3>
                        <div className="flex gap-4">
                            <input
                                type="email"
                                value={testEmailAddress}
                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                placeholder="Enter email address to test"
                                className="flex-1 h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={handleTestEmail}
                                disabled={testing || !testEmailAddress}
                                className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {testing ? (
                                    <LoadingSpinner size="sm" color="white" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">send</span>
                                        Send Test
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
