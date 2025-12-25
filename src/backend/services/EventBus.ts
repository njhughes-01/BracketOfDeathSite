import { EventEmitter } from "events";

type TournamentEvent = {
  type: string;
  tournamentId: string;
  payload?: unknown;
  timestamp?: string;
};

class EventBus {
  private emitter = new EventEmitter();
  // Avoid memory leak warnings for many listeners at live events
  constructor() {
    this.emitter.setMaxListeners(0);
  }

  onTournament(
    id: string,
    listener: (evt: TournamentEvent) => void,
  ): () => void {
    const channel = this.channel(id);
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  emitTournament(id: string, type: string, payload?: unknown): void {
    const evt: TournamentEvent = {
      type,
      tournamentId: id,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit(this.channel(id), evt);
  }

  private channel(id: string): string {
    return `tournament:${id}`;
  }
}

export const eventBus = new EventBus();
export type { TournamentEvent };
