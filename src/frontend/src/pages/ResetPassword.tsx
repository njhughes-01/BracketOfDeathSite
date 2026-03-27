import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../services/api";
import { Heading, Text, Button, Input, FormField, Stack } from "../components/ui";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetPassword(token!, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#1c2230] rounded-2xl p-8 text-center">
          <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
          </div>
          <Heading level={2} className="!text-2xl mb-4">Password Reset Successful</Heading>
          <Text color="muted" className="mb-6">
            Your password has been updated. You can now sign in with your new password.
          </Text>
          <Link to="/login">
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1c2230] rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
          </div>
          <Heading level={2} className="!text-2xl">Reset Your Password</Heading>
          <Text color="muted" className="mt-2">Enter your new password below</Text>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Stack direction="vertical" gap={4}>
            <FormField label="NEW PASSWORD">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={!token}
              />
            </FormField>

            <FormField label="CONFIRM PASSWORD">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={!token}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading || !token}
              icon={loading ? undefined : "lock_reset"}
            >
              {loading ? (
                <div className="animate-spin size-5 border-2 border-black border-t-transparent rounded-full"></div>
              ) : (
                "Reset Password"
              )}
            </Button>
          </Stack>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary hover:text-white text-sm transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
