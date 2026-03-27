import React from "react";
import type { Tournament } from "../../types/api";
import TournamentCard from "./TournamentCard";
import { Heading, Text, Container, ResponsiveGrid, Stack } from "../../components/ui";

interface UpcomingTournamentsProps {
  tournaments: Tournament[];
  loading: boolean;
  onRegister: (id: string) => void;
}

const UpcomingTournaments: React.FC<UpcomingTournamentsProps> = ({
  tournaments,
  loading,
  onRegister,
}) => (
  <section>
    <Container maxWidth="xl" padding="md" className="py-16">
      <Stack direction="horizontal" gap={3} align="center" className="mb-8">
        <span className="material-symbols-outlined text-3xl text-accent">
          emoji_events
        </span>
        <Heading level={2} className="!text-3xl">Upcoming Tournaments</Heading>
      </Stack>

      {loading ? (
        <ResponsiveGrid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card-dark rounded-2xl border border-white/5 h-64 animate-pulse"
            />
          ))}
        </ResponsiveGrid>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-16 bg-card-dark rounded-2xl border border-white/5">
          <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">
            event_busy
          </span>
          <Text size="lg" color="muted">
            No upcoming tournaments at the moment.
          </Text>
          <Text color="muted" className="mt-1">Check back soon!</Text>
        </div>
      ) : (
        <ResponsiveGrid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id || tournament._id}
              tournament={tournament}
              onRegister={onRegister}
            />
          ))}
        </ResponsiveGrid>
      )}
    </Container>
  </section>
);

export default UpcomingTournaments;
