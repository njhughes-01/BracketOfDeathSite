import { Types } from 'mongoose';
import { ITournament } from '../types/tournament';
export interface RegistrationResult {
    success: boolean;
    message: string;
    position?: 'registered' | 'waitlist';
    tournament?: ITournament;
}
export declare class TournamentRegistrationService {
    /**
     * Register a player for a tournament
     */
    static registerPlayer(tournamentId: string, playerId: string): Promise<RegistrationResult>;
    /**
     * Unregister a player from a tournament
     */
    static unregisterPlayer(tournamentId: string, playerId: string): Promise<RegistrationResult>;
    /**
     * Move registered players to main players array and generate bracket
     */
    static finalizeRegistration(tournamentId: string): Promise<RegistrationResult>;
    /**
     * Get registration info for a tournament
     */
    static getRegistrationInfo(tournamentId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            tournament: import("mongoose").Document<unknown, {}, ITournament, {}, {}> & ITournament & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            };
            registrationStatus: "closed" | "open" | "pending" | "full";
            registeredCount: number;
            waitlistCount: number;
            maxPlayers: number;
            isRegistrationOpen: boolean;
            canRegister: boolean;
        };
        message?: undefined;
    }>;
}
export default TournamentRegistrationService;
//# sourceMappingURL=TournamentRegistrationService.d.ts.map