import { eventBus } from "../../services/EventBus";

describe("EventBus Service", () => {

    it("should allow subscribing to tournament events", () => {
        const listener = jest.fn();
        const tournamentId = "tourn-123";

        const unsubscribe = eventBus.onTournament(tournamentId, listener);

        eventBus.emitTournament(tournamentId, "TEST_EVENT", { foo: "bar" });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
            type: "TEST_EVENT",
            tournamentId: tournamentId,
            payload: { foo: "bar" }
        }));

        // Clean up
        unsubscribe();
    });

    it("should unsubscribe correctly", () => {
        const listener = jest.fn();
        const tournamentId = "tourn-456";

        const unsubscribe = eventBus.onTournament(tournamentId, listener);

        eventBus.emitTournament(tournamentId, "EVENT_1");
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();

        eventBus.emitTournament(tournamentId, "EVENT_2");
        expect(listener).toHaveBeenCalledTimes(1); // Should not increase
    });

    it("should handle separate channels for different tournaments", () => {
        const listenerA = jest.fn();
        const listenerB = jest.fn();

        eventBus.onTournament("tourn-A", listenerA);
        eventBus.onTournament("tourn-B", listenerB);

        eventBus.emitTournament("tourn-A", "EVENT_A");

        expect(listenerA).toHaveBeenCalledTimes(1);
        expect(listenerB).not.toHaveBeenCalled();
    });
});
