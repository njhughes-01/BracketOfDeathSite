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

    // Form state - Mailjet
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [testEmailAddress, setTestEmailAddress] = useState('');

    // Form state - Branding
    const [brandName, setBrandName] = useState('Bracket of Death');
    const [brandPrimaryColor, setBrandPrimaryColor] = useState('#4CAF50');
    const [brandSecondaryColor, setBrandSecondaryColor] = useState('#008CBA');
    const [siteLogo, setSiteLogo] = useState<string>('');
    const [favicon, setFavicon] = useState<string>('');

    // Template preview variables
    const [previewPlayerName, setPreviewPlayerName] = useState('John Doe');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getSystemSettings();
            setSettings(data);
            setSenderEmail(data.mailjetSenderEmail);
            // Load branding settings
            setBrandName(data.brandName || 'Bracket of Death');
            setBrandPrimaryColor(data.brandPrimaryColor || '#4CAF50');
            setBrandSecondaryColor(data.brandSecondaryColor || '#008CBA');
            setSiteLogo(data.siteLogo || '');
            setFavicon(data.favicon || '');
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
                mailjetApiKey: apiKey || undefined,
                mailjetApiSecret: apiSecret || undefined,
                mailjetSenderEmail: senderEmail,
                siteLogo,
                favicon,
                brandName,
                brandPrimaryColor,
                brandSecondaryColor,
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

            {/* Branding Configuration */}
            <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500">
                        <span className="material-symbols-outlined">palette</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Branding</h2>
                        <p className="text-sm text-slate-400">Customize your site's identity and email appearance</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand Name */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            Brand Name
                        </label>
                        <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="Your Site Name"
                            className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            Site Logo
                        </label>
                        <div className="flex items-center gap-4">
                            {siteLogo && (
                                <img src={siteLogo} alt="Logo" className="h-12 w-auto rounded bg-white/10 p-2" />
                            )}
                            <label className="flex-1 h-12 bg-black/20 border border-white/10 border-dashed rounded-xl px-4 flex items-center justify-center gap-2 text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
                                <span className="material-symbols-outlined text-sm">upload</span>
                                <span className="text-sm">Upload Logo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setSiteLogo(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                            {siteLogo && (
                                <button
                                    type="button"
                                    onClick={() => setSiteLogo('')}
                                    className="h-12 px-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Favicon Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            Favicon
                        </label>
                        <div className="flex items-center gap-4">
                            {favicon && (
                                <img src={favicon} alt="Favicon" className="h-12 w-12 rounded bg-white/10 p-2" />
                            )}
                            <label className="flex-1 h-12 bg-black/20 border border-white/10 border-dashed rounded-xl px-4 flex items-center justify-center gap-2 text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
                                <span className="material-symbols-outlined text-sm">upload</span>
                                <span className="text-sm">Upload Favicon</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setFavicon(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>
                            {favicon && (
                                <button
                                    type="button"
                                    onClick={() => setFavicon('')}
                                    className="h-12 px-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Primary Color */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            Primary Color
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                value={brandPrimaryColor}
                                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                                className="h-12 w-14 rounded-xl border-0 cursor-pointer bg-transparent"
                            />
                            <input
                                type="text"
                                value={brandPrimaryColor}
                                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                                className="flex-1 h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-slate-500">Used for primary action buttons in emails</p>
                    </div>

                    {/* Secondary Color */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                            Secondary Color
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                value={brandSecondaryColor}
                                onChange={(e) => setBrandSecondaryColor(e.target.value)}
                                className="h-12 w-14 rounded-xl border-0 cursor-pointer bg-transparent"
                            />
                            <input
                                type="text"
                                value={brandSecondaryColor}
                                onChange={(e) => setBrandSecondaryColor(e.target.value)}
                                className="flex-1 h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white font-mono focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <p className="text-xs text-slate-500">Used for links and secondary buttons</p>
                    </div>
                </div>

                <div className="pt-4 mt-6 border-t border-white/5 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSubmit as any}
                        disabled={saving}
                        className="h-12 px-8 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {saving ? (
                            <LoadingSpinner size="sm" color="black" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Save Branding
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Template Preview Variables */}
            <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500">
                        <span className="material-symbols-outlined">tune</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Template Preview Variables</h2>
                        <p className="text-sm text-slate-400">Customize the data shown in template previews below</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Player Name</label>
                        <input
                            type="text"
                            value={previewPlayerName}
                            onChange={(e) => setPreviewPlayerName(e.target.value)}
                            className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Email Templates Preview */}
            <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                        <span className="material-symbols-outlined">article</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Email Templates</h2>
                        <p className="text-sm text-slate-400">Preview of emails sent by the system</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Claim Invitation Template */}
                    <div className="border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/5 px-4 py-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500">person_add</span>
                            <span className="font-bold text-white">Profile Claim Invitation</span>
                            <span className="ml-auto text-xs text-slate-500">Sent when inviting a player to claim their profile</span>
                        </div>
                        <div className="p-4 bg-white text-black">
                            <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
                                <div style={{ backgroundColor: '#1a1a2e', padding: '20px', textAlign: 'center', marginBottom: '20px', borderRadius: '8px 8px 0 0' }}>
                                    {siteLogo ? (
                                        <img src={siteLogo} alt={brandName} style={{ height: '50px', margin: '0 auto' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: brandPrimaryColor }}>{brandName}</span>
                                    )}
                                </div>
                                <h2 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Claim your Player Profile</h2>
                                <p>Hello!</p>
                                <p>You have been invited to claim your player profile <strong>{previewPlayerName}</strong> on {brandName}.</p>
                                <p>This will link your existing tournament history and stats to your new account.</p>
                                <p>
                                    <span style={{
                                        backgroundColor: brandPrimaryColor,
                                        color: 'white',
                                        padding: '10px 20px',
                                        textDecoration: 'none',
                                        borderRadius: '5px',
                                        display: 'inline-block',
                                        marginTop: '10px'
                                    }}>
                                        Create Account & Claim Profile
                                    </span>
                                </p>
                                <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                                    Or copy this link: <span style={{ color: brandSecondaryColor }}>https://yoursite.com/register?claimToken=...</span>
                                </p>
                                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', textAlign: 'center', borderTop: '1px solid #eee' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Reset Template */}
                    <div className="border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/5 px-4 py-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">lock_reset</span>
                            <span className="font-bold text-white">Password Reset</span>
                            <span className="ml-auto text-xs text-slate-500">Sent when user requests password reset</span>
                        </div>
                        <div className="p-4 bg-white text-black">
                            <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
                                <div style={{ backgroundColor: '#1a1a2e', padding: '20px', textAlign: 'center', marginBottom: '20px', borderRadius: '8px 8px 0 0' }}>
                                    {siteLogo ? (
                                        <img src={siteLogo} alt={brandName} style={{ height: '50px', margin: '0 auto' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: brandPrimaryColor }}>{brandName}</span>
                                    )}
                                </div>
                                <h2 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>Reset Password</h2>
                                <p>You requested a password reset for your {brandName} account.</p>
                                <p>
                                    <span style={{
                                        backgroundColor: brandSecondaryColor,
                                        color: 'white',
                                        padding: '10px 20px',
                                        textDecoration: 'none',
                                        borderRadius: '5px',
                                        display: 'inline-block',
                                        marginTop: '10px'
                                    }}>
                                        Reset Password
                                    </span>
                                </p>
                                <p>If you didn't ask for this, you can ignore this email.</p>
                                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', textAlign: 'center', borderTop: '1px solid #eee' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test Email Template */}
                    <div className="border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/5 px-4 py-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">send</span>
                            <span className="font-bold text-white">Test Email</span>
                            <span className="ml-auto text-xs text-slate-500">Sent when testing email configuration</span>
                        </div>
                        <div className="p-4 bg-white text-black">
                            <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
                                <div style={{ backgroundColor: '#1a1a2e', padding: '20px', textAlign: 'center', marginBottom: '20px', borderRadius: '8px 8px 0 0' }}>
                                    {siteLogo ? (
                                        <img src={siteLogo} alt={brandName} style={{ height: '50px', margin: '0 auto' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: brandPrimaryColor }}>{brandName}</span>
                                    )}
                                </div>
                                <h2 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>🎾 Email Configuration Test</h2>
                                <p>This is a test email from <strong>{brandName}</strong>.</p>
                                <p>If you received this, your email configuration is working correctly!</p>
                                <p>
                                    <span style={{
                                        backgroundColor: brandPrimaryColor,
                                        color: 'white',
                                        padding: '10px 20px',
                                        textDecoration: 'none',
                                        borderRadius: '5px',
                                        display: 'inline-block',
                                        marginTop: '10px'
                                    }}>
                                        Visit Site
                                    </span>
                                </p>
                                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', textAlign: 'center', borderTop: '1px solid #eee' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
