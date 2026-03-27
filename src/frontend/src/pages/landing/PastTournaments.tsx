import React from "react";
import type { Tournament } from "../../types/api";
import { Heading, Text, Container, ResponsiveGrid, Stack } from "../../components/ui";

interface PastTournamentsProps {
  tournaments: Tournament[];
}

const formatShortDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const PastTournaments: React.FC<PastTournamentsProps> = ({ tournaments }) => {
  if (tournaments.length === 0) return null;

  return (
    <section>
      <Container maxWidth="xl" padding="md" className="py-16">
        <Stack direction="horizontal" gap={3} align="center" className="mb-8">
          <span className="material-symbols-outlined text-3xl text-slate-400">
            history
          </span>
          <Heading level={2} className="!text-3xl">Past Tournaments</Heading>
        </Stack>

        <ResponsiveGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} gap={4}>
          {tournaments.map((tournament) => (
            <div
              key={tournament.id || tournament._id}
              className="bg-card-dark border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-sm">
                  calendar_month
                </span>
                {formatShortDate(tournament.date)}
              </div>
              <Heading level={3} className="!text-base mb-1">
                {tournament.location}
              </Heading>
              <Stack direction="horizontal" gap={2} align="center" className="text-slate-500 text-sm">
                <span className="px-2 py-0.5 bg-white/5 rounded text-xs font-medium">
                  BOD #{tournament.bodNumber}
                </span>
                <Text size="sm" color="muted">{tournament.format}</Text>
              </Stack>
            </div>
          ))}
        </ResponsiveGrid>
      </Container>
    </section>
  );
};

export default PastTournaments;
