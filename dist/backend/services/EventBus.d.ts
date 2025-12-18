type TournamentEvent = {
    type: string;
    tournamentId: string;
    payload?: unknown;
    timestamp?: string;
};
declare class EventBus {
    private emitter;
    constructor();
    onTournament(id: string, listener: (evt: TournamentEvent) => void): () => void;
    emitTournament(id: string, type: string, payload?: unknown): void;
    private channel;
}
export declare const eventBus: EventBus;
export type { TournamentEvent };
//# sourceMappingURL=EventBus.d.ts.map