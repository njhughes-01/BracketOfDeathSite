"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
class EventBus {
    emitter = new events_1.EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(0);
    }
    onTournament(id, listener) {
        const channel = this.channel(id);
        this.emitter.on(channel, listener);
        return () => this.emitter.off(channel, listener);
    }
    emitTournament(id, type, payload) {
        const evt = {
            type,
            tournamentId: id,
            payload,
            timestamp: new Date().toISOString(),
        };
        this.emitter.emit(this.channel(id), evt);
    }
    channel(id) {
        return `tournament:${id}`;
    }
}
exports.eventBus = new EventBus();
//# sourceMappingURL=EventBus.js.map