import React from 'react';
import { Heading, Text, Container, Stack } from '../components/ui';

const Rules: React.FC = () => {
  return (
    <Container maxWidth="md" padding="md" className="py-12">
      <Heading level={1} responsive className="mb-6">Rules</Heading>

      <Stack direction="vertical" gap={8}>
        <Text size="lg" color="muted">
          Although the Bracket of Death has a ridiculous name, it's still a "real" tennis tournament,
          so most of the standard rules apply: Regular scoring, the lines are in, etc., etc.
        </Text>

        <section>
          <Heading level={2} responsive className="mb-4">Regular Scoring</Heading>
          <Text color="muted">
            As many deuces and/or ad ins and/or ad outs as it takes. (Unless we get pressed for time
            and have to switch to a no-ad format, in which case I'll let everyone know)
          </Text>
        </section>

        <section>
          <Heading level={2} responsive className="mb-4">Play Let Serves</Heading>
          <Text color="muted">
            Play the lets. Additionally, there's no penalty for calling a let. If you call a let –
            and you probably will the first few times it happens – you'll just look a little silly
            as play goes on. Also, a let serve is playable by either player on the returning side,
            so both returning-side players need to be ready!
          </Text>
        </section>

        <section>
          <Heading level={2} responsive className="mb-4">Match Format</Heading>
          <Stack direction="vertical" gap={4}>
            <Text color="muted">
              Each match in the tournament is an 11-game pro-set (first to 11 by 2) with an 11-point
              Coman tiebreaker played at 10-10. Tiebreakers are first to 11 by 2, and will be scored 11-10.
            </Text>
            <Text color="muted">
              Teams play three (3) 11-game pro-sets to get into the bracket.{' '}
              <strong>All teams will advance to the Round of 16</strong>, where seeding will be based
              on most games won and fewest games lost from the Round Robin stage. For example, a team
              with a record of 33-8 will be seeded higher than team with a record of 33-11. In case of
              a tie on both games won and games lost, the team from the lower-numbered division will be
              given the lower seed (e.g., Div 1 is lower than Div 2). All matches after the round robin
              stage are single elimination. You lose, you're out.
            </Text>
            <div className="bg-surface-dark p-4 rounded-lg border-l-4 border-gray-600">
              <Text size="sm" color="muted">
                <strong>Note:</strong> There are no breaks during the round-robin stage, other than
                between-match bathroom and/or water breaks, so don't take off. If you bail, and your
                opponents are ready to play, your partner will just have to play solo until you return.
              </Text>
            </div>
            <Text color="muted">
              Use a new can of balls for each match
            </Text>
          </Stack>
        </section>

        <section>
          <Heading level={2} responsive className="mb-4">
            Let Cord Aces
          </Heading>
          <Text color="muted">
            Appropriately known as <strong>"ACES OF DEATH!"</strong>, they are both loved and loathed.
          </Text>
        </section>

        <section>
          <Heading level={2} responsive className="mb-4">
            Late Player / No Show / Injured Player
          </Heading>
          <Text color="muted">
            Also known as the "Don't be late and don't get hurt!" rule! Play starts at the scheduled
            time whether you and/or your partner are there or not. And remember, the BOD is a doubles
            tournament, so if you have to play solo, you have to cover the <em>entire court</em>.
            Remember, folks: Bracket. Of. Death.
          </Text>
        </section>

        <section>
          <Heading level={2} responsive className="mb-4">Refunds</Heading>
          <Stack direction="vertical" gap={4}>
            <Text color="muted">
              If you're gonna cancel, cancel early. It's a hassle to replace people, so please don't
              register if you're not <strong>sure</strong> you can play.
            </Text>
            <Text color="muted">
              Having said that, refunds <em>are</em> possible, and if there's time, I'll issue a refund.
              But if you bail out after the drawing party… No refund. At that point, I've already ordered
              all the T-shirts, trophies, balls, etc., so just know that ahead of time.
            </Text>
          </Stack>
        </section>

        <section className="bg-tennis-green/10 p-6 rounded-lg border-2 border-tennis-green">
          <Heading level={2} responsive className="mb-4">Have Fun!</Heading>
          <Text size="lg" color="muted">
            Although the BOD is competitive, it's also supposed to be fun, so please,{' '}
            <strong className="text-xl">Don't. Be. A Jackass</strong>.
            Win or lose, nobody is going to gain or lose any sponsors or ranking points at the BOD,
            so just have fun!
          </Text>
        </section>
      </Stack>
    </Container>
  );
};

export default Rules;
