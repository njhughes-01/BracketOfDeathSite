import { eventBus, TournamentEvent } from "../../../../src/backend/services/EventBus";

describe("EventBus", () => {
    describe("onTournament", () => {
        it("should register a listener and receive events", () => {
            const tournamentId = "test-tournament-123";
            const mockListener = jest.fn();

            // Subscribe to tournament events
            const unsubscribe = eventBus.onTournament(tournamentId, mockListener);

            // Emit an event
            eventBus.emitTournament(tournamentId, "MATCH_UPDATE", { matchId: "m1" });

            // Verify listener was called
            expect(mockListener).toHaveBeenCalledTimes(1);
            expect(mockListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "MATCH_UPDATE",
                    tournamentId,
                    payload: { matchId: "m1" },
                    timestamp: expect.any(String),
                })
            );

            // Cleanup
            unsubscribe();
        });

        it("should return an unsubscribe function", () => {
            const tournamentId = "unsub-test";
            const mockListener = jest.fn();

            const unsubscribe = eventBus.onTournament(tournamentId, mockListener);

            // Emit before unsubscribe
            eventBus.emitTournament(tournamentId, "EVENT_1", null);
            expect(mockListener).toHaveBeenCalledTimes(1);

            // Unsubscribe
            unsubscribe();

            // Emit after unsubscribe
            eventBus.emitTournament(tournamentId, "EVENT_2", null);
            expect(mockListener).toHaveBeenCalledTimes(1); // Still 1, not 2
        });

        it("should isolate events by tournament ID", () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            const unsub1 = eventBus.onTournament("tournament-A", listener1);
            const unsub2 = eventBus.onTournament("tournament-B", listener2);

            // Emit to tournament A only
            eventBus.emitTournament("tournament-A", "TEST", null);

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).not.toHaveBeenCalled();

            unsub1();
            unsub2();
        });
    });

    describe("emitTournament", () => {
        it("should emit events with correct structure", () => {
            const tournamentId = "emit-test";
            const mockListener = jest.fn();

            const unsubscribe = eventBus.onTournament(tournamentId, mockListener);

            eventBus.emitTournament(tournamentId, "SCORE_UPDATE", { team1: 3, team2: 2 });

            const event: TournamentEvent = mockListener.mock.calls[0][0];
            expect(event.type).toBe("SCORE_UPDATE");
            expect(event.tournamentId).toBe(tournamentId);
            expect(event.payload).toEqual({ team1: 3, team2: 2 });
            expect(event.timestamp).toBeDefined();
            expect(new Date(event.timestamp!).getTime()).not.toBeNaN();

            unsubscribe();
        });

        it("should handle emit without payload", () => {
            const tournamentId = "no-payload";
            const mockListener = jest.fn();

            const unsubscribe = eventBus.onTournament(tournamentId, mockListener);

            eventBus.emitTournament(tournamentId, "TOURNAMENT_START");

            const event = mockListener.mock.calls[0][0];
            expect(event.type).toBe("TOURNAMENT_START");
            expect(event.payload).toBeUndefined();

            unsubscribe();
        });

        it("should support multiple listeners on same tournament", () => {
            const tournamentId = "multi-listener";
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            const listener3 = jest.fn();

            const unsub1 = eventBus.onTournament(tournamentId, listener1);
            const unsub2 = eventBus.onTournament(tournamentId, listener2);
            const unsub3 = eventBus.onTournament(tournamentId, listener3);

            eventBus.emitTournament(tournamentId, "BROADCAST", { message: "Hello" });

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(1);

            unsub1();
            unsub2();
            unsub3();
        });
    });
});
