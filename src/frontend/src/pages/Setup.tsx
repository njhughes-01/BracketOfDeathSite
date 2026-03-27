import React, { useEffect, useState } from "react";
import logger from "../utils/logger";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { LoadingSpinner, Heading, Text, Button, Stack } from "../components/ui";

const Setup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await apiClient.getSystemStatus();
        if (status.data?.initialized) {
          navigate("/login", { replace: true });
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        logger.error("Failed to check system status:", err);
        navigate("/login", { replace: true });
      }
    };

    checkStatus();
  }, [navigate]);

  const handleStartSetup = () => {
    navigate("/register?setup=true");
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] bg-primary/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] bg-accent/5 blur-[80px] rounded-full"></div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 max-w-md mx-auto w-full z-10 py-10">
        <Stack direction="vertical" gap={6}>
          {/* Special System Init Card */}
          <div className="relative overflow-hidden bg-[#0f1115] border border-amber-500/30 rounded-xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            {/* Decorative "Terminal" Header */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-300 opacity-50"></div>
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="size-2 rounded-full bg-red-500/20"></div>
              <div className="size-2 rounded-full bg-amber-500/50 animate-pulse"></div>
              <div className="size-2 rounded-full bg-green-500/20"></div>
            </div>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="size-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="material-symbols-outlined text-amber-500 !text-[40px]">
                  shield_person
                </span>
              </div>
              <Heading level={3} className="!text-2xl mb-2">
                System Not Initialized
              </Heading>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono font-bold tracking-wider uppercase">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Setup Required
              </div>
            </div>

            <Text size="sm" color="muted" className="text-center mb-8 max-w-sm mx-auto leading-relaxed">
              The system has detected that no Super Administrator exists. Please
              create the first account to claim root access and initialize the
              platform.
            </Text>

            <Button
              variant="primary"
              fullWidth
              onClick={handleStartSetup}
              icon="person_add"
              className="h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            >
              Create Admin Account
            </Button>

            <Text size="xs" color="muted" className="text-center mt-4 font-mono text-slate-600">
              WAITING_FOR_ADMIN_REGISTRATION...
            </Text>
          </div>
        </Stack>
      </div>
    </div>
  );
};

export default Setup;
