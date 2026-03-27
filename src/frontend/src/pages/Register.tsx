import React, { useState, useEffect } from "react";
import logger from "../utils/logger";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input, FormField, Heading, Text, Stack } from "../components/ui";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const claimToken = searchParams.get("claimToken");
  const isSetupMode = searchParams.get("setup") === "true";
  const { isAuthenticated, setDirectAuthTokens, initializeAuth } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (claimToken) {
      try {
        const decoded: any = jwtDecode(claimToken);
        if (decoded && decoded.email) {
          setFormData((prev) => ({ ...prev, email: decoded.email }));
          setIsClaiming(true);
        }
      } catch (e) {
        logger.error("Invalid claim token", e);
        setError("Invalid or expired invitation link.");
      }
    }
  }, [claimToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Read values directly from form inputs to handle browser autofill
    const form = e.currentTarget;
    const passwordInput = form.querySelector<HTMLInputElement>("#password");
    const confirmPasswordInput =
      form.querySelector<HTMLInputElement>("#confirmPassword");

    const password = passwordInput?.value || formData.password;
    const confirmPassword =
      confirmPasswordInput?.value || formData.confirmPassword;

    // Update formData with actual values from inputs (in case autofill didn't trigger onChange)
    const actualFormData = {
      ...formData,
      password,
      confirmPassword,
    };

    if (actualFormData.password !== actualFormData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (actualFormData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    try {
      setIsLoading(true);
      await axios.post("/api/auth/register", {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: actualFormData.password,
        claimToken: claimToken || undefined,
      });

      // If in setup mode, auto-login and redirect to onboarding to claim superadmin
      if (isSetupMode) {
        try {
          // Use Keycloak direct grant flow to get tokens
          const tokenUrl = `/auth/realms/${import.meta.env.VITE_KEYCLOAK_REALM || "bracketofdeathsite"}/protocol/openid-connect/token`;
          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "password",
              client_id: "bod-app",
              username: formData.username,
              password: actualFormData.password,
            }),
          });

          if (response.ok) {
            const tokenData = await response.json();
            await initializeAuth();
            await setDirectAuthTokens({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              id_token: tokenData.id_token,
            });
            localStorage.setItem("hasLoggedInBefore", "true");
            // Small delay to allow React state to propagate before navigation
            // This prevents ProtectedRoute from seeing stale isAuthenticated=false
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Navigate directly to onboarding to claim superadmin
            navigate("/onboarding", { replace: true });
            return;
          }
        } catch (loginErr) {
          logger.error(
            "Auto-login after setup registration failed:",
            loginErr,
          );
          // Fall through to normal login redirect
        }
      }

      // Navigate to login with success message
      const returnUrl = searchParams.get("returnUrl");
      navigate(
        returnUrl
          ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
          : "/login",
        {
          state: { message: "Registration successful! Please log in." },
        },
      );
    } catch (err: any) {
      logger.error("Registration failed:", err);
      setError(
        err.response?.data?.error || "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">
      {/* Background/Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-accent/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full z-10 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary to-green-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-6 rotate-3">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: "32px" }}
            >
              person_add
            </span>
          </div>
          <Heading level={2} className="text-3xl mb-2">
            {isClaiming ? "Claim Profile" : "Create Account"}
          </Heading>
          <Text color="muted">
            {isClaiming
              ? "Complete your registration to link your player profile."
              : "Join the Bracket of Death"}
          </Text>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <FormField label="USERNAME">
            <Input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              icon="account_circle"
              placeholder="jdoe"
              className="h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="EMAIL">
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={isClaiming}
              icon="mail"
              placeholder="john@example.com"
              className={`h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary ${isClaiming ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </FormField>

          <Stack direction="responsive" gap={4}>
            <FormField label="FIRST NAME" className="flex-1">
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                className="h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary"
              />
            </FormField>
            <FormField label="LAST NAME" className="flex-1">
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className="h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary"
              />
            </FormField>
          </Stack>

          <FormField label="PASSWORD">
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              icon="lock"
              placeholder="••••••••"
              className="h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <FormField label="CONFIRM PASSWORD">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              icon="lock_reset"
              placeholder="••••••••"
              className="h-14 bg-[#1c2230] border-white/5 rounded-xl focus:ring-2 focus:ring-primary"
            />
          </FormField>

          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            fullWidth
            className="mt-2 h-14 bg-primary hover:bg-primary-dark active:scale-[0.98] text-black text-base font-bold rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        <div className="mt-10 text-center pb-8">
          <Text size="sm" color="muted" as="p">
            Already have an account?
            <Link
              to="/login"
              className="font-bold text-white hover:text-primary transition-colors ml-1"
            >
              Log In
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default Register;
