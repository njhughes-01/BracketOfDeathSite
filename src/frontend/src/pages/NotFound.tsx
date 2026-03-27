import React from "react";
import { Link } from "react-router-dom";
import { Heading, Text, Stack, Button } from "../components/ui";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background-dark p-4">
      <div className="text-center max-w-lg mx-auto">
        {/* Animated 404 Visual */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative bg-[#1c2230] w-full h-full rounded-full border border-white/10 flex items-center justify-center shadow-xl shadow-black/50">
            <span className="text-8xl select-none">🎾</span>
            <div className="absolute -bottom-2 -right-2 bg-red-500 text-white font-bold text-xs px-2 py-1 rounded-md border border-red-400 rotate-12">
              OUT!
            </div>
          </div>
        </div>

        <Heading level={1} className="!text-6xl font-black mb-2 tracking-tighter">
          404
        </Heading>
        <Heading level={2} className="!text-2xl text-slate-300 mb-6">
          Page Not Found
        </Heading>
        <Text size="lg" color="muted" className="mb-10 leading-relaxed">
          The ball is out of bounds. The page you're looking for doesn't exist
          or has been moved.
        </Text>

        <Stack direction="vertical" gap={3}>
          <Link to="/dashboard">
            <Button variant="primary" fullWidth className="py-4 shadow-lg shadow-primary/20">
              Return Home
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/tournaments">
              <Button variant="secondary" fullWidth size="sm">
                Tournaments
              </Button>
            </Link>
            <Link to="/players">
              <Button variant="secondary" fullWidth size="sm">
                Players
              </Button>
            </Link>
          </div>
        </Stack>
      </div>
    </div>
  );
};

export default NotFound;
