import React from "react";
import { Link } from "react-router-dom";
import { Heading, Text, Container, ResponsiveGrid } from "../components/ui";

const News: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      <div className="relative h-[250px] w-full bg-surface-dark overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1533561797500-4fad143ca75c?q=80&w=2070&auto=format&fit=crop")',
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-black/60"></div>

        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20">
          <Link
            to="/dashboard"
            className="size-10 rounded-full bg-black/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <Heading level={1} className="!text-4xl shadow-black drop-shadow-md mb-2">
            News & Updates
          </Heading>
          <Text color="muted">Latest from the Bracket of Death</Text>
        </div>
      </div>

      <Container padding="md" maxWidth="lg" className="text-center space-y-8">
        <div className="bg-[#1c2230] border border-white/5 rounded-2xl p-8">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-3xl">campaign</span>
          </div>
          <Heading level={2} className="!text-2xl mb-2">Coming Soon</Heading>
          <Text color="muted" className="max-w-md mx-auto">
            The news feed is currently under construction. Check back later for
            match recaps, player spotlights, and tournament announcements.
          </Text>
        </div>

        <ResponsiveGrid cols={{ base: 1, md: 2 }} gap={4} className="text-left">
          <Link
            to="/tournaments"
            className="bg-[#1c2230] border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all group"
          >
            <span className="material-symbols-outlined text-primary mb-3">
              trophy
            </span>
            <Heading level={3} className="!text-base mb-1 group-hover:text-primary transition-colors">
              Upcoming Tournaments
            </Heading>
            <Text size="xs" color="muted">
              View the schedule and register for events.
            </Text>
          </Link>
          <Link
            to="/rankings"
            className="bg-[#1c2230] border border-white/5 rounded-xl p-5 hover:border-primary/50 transition-all group"
          >
            <span className="material-symbols-outlined text-primary mb-3">
              leaderboard
            </span>
            <Heading level={3} className="!text-base mb-1 group-hover:text-primary transition-colors">
              Season Standings
            </Heading>
            <Text size="xs" color="muted">
              Check who is leading the race for #1.
            </Text>
          </Link>
        </ResponsiveGrid>
      </Container>
    </div>
  );
};

export default News;
