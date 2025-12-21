import { Types } from 'mongoose';
import { ITournament } from '../types/tournament';
export interface RegistrationResult {
    success: boolean;
    message: string;
    position?: 'registered' | 'waitlist';
    tournament?: ITournament;
}
export declare class TournamentRegistrationService {
    static registerPlayer(tournamentId: string, playerId: string): Promise<RegistrationResult>;
    static unregisterPlayer(tournamentId: string, playerId: string): Promise<RegistrationResult>;
    static finalizeRegistration(tournamentId: string): Promise<RegistrationResult>;
    static getRegistrationInfo(tournamentId: string): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        data: {
            tournament: import("mongoose").Document<unknown, {}, ITournament, {}> & ITournament & Required<{
                _id: Types.ObjectId;
            }> & {
                __v: number;
            };
            registrationStatus: "open" | "pending" | "closed" | "full";
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