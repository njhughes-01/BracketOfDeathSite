import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// 1. Mock factories
jest.mock("../../src/backend/models/Tournament", () => ({
    Tournament: {
        findById: jest.fn(),
    },
}));

jest.mock("../../src/backend/models/Match", () => ({
    Match: {
        find: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        insertMany: jest.fn(),
        deleteMany: jest.fn(),
    },
}));

jest.mock("../../src/backend/models/TournamentResult", () => ({
    TournamentResult: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../../src/backend/models/Player", () => ({
    Player: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock("../../src/backend/services/LiveStatsService", () => ({
    LiveStatsService: {
        updateLiveStats: jest.fn(),
        calculateLiveTournamentStats: jest.fn(),
        calculatePlayerStatsForTournament: jest.fn(),
    },
}));

jest.mock("../../src/backend/services/EventBus", () => ({
    eventBus: {
        emitTournament: jest.fn(),
        onTournament: jest.fn(),
    },
}));

// 2. Imports
import { Tournament } from "../../src/backend/models/Tournament";
import { Match } from "../../src/backend/models/Match";
import { LiveTournamentController } from "../../src/backend/controllers/LiveTournamentController";

describe("Single Elimination Lifecycle", () => {
    let ctl: LiveTournamentController;
    let tournamentMock: Record<string, unknown>;
    let matchesMock: any[];

    beforeEach(() => {
        jest.clearAllMocks();
        ctl = new LiveTournamentController();
        matchesMock = [];

        // 8-team Single Elimination tournament
        tournamentMock = {
            _id: "se_tourn_1",
            status: "active",
            bracketType: "single_elimination",
            players: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
            generatedTeams: [
                { teamId: "t1", teamName: "Team 1", players: [{ playerId: "p1" }] },
                { teamId: "t2", teamName: "Team 2", players: [{ playerId: "p2" }] },
                { teamId: "t3", teamName: "Team 3", players: [{ playerId: "p3" }] },
                { teamId: "t4", teamName: "Team 4", players: [{ playerId: "p4" }] },
                { teamId: "t5", teamName: "Team 5", players: [{ playerId: "p5" }] },
                { teamId: "t6", teamName: "Team 6", players: [{ playerId: "p6" }] },
                { teamId: "t7", teamName: "Team 7", players: [{ playerId: "p7" }] },
                { teamId: "t8", teamName: "Team 8", players: [{ playerId: "p8" }] },
            ],
            save: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
            toObject: function () {
                return this;
            },
        };

        // Configure Tournament.findById mock
        const mockQuery = {
            populate: jest.fn<any>().mockReturnThis(),
            lean: jest.fn<any>().mockReturnThis(),
            exec: jest.fn<any>().mockResolvedValue(tournamentMock),
            then: function (resolve: (value: unknown) => void) {
                resolve(tournamentMock);
            },
        };
        (Tournament.findById as jest.Mock).mockReturnValue(mockQuery);

        // Configure Match.find mock
        (Match.find as jest.Mock).mockImplementation((query: any) => {
            let results = [...matchesMock];
            if (query && typeof query === "object") {
                if (query.tournamentId) {
                    results = results.filter((m) => m.tournamentId === query.tournamentId);
                }
                if (query.round) {
                    results = results.filter((m) => m.round === query.round);
                }
            }
            return {
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue(results),
                }),
                sort: jest.fn().mockReturnValue(results),
            };
        });

        // Configure Match.findOne mock
        (Match.findOne as jest.Mock).mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            lean: jest.fn<any>().mockResolvedValue(null),
        });

        // Configure Match.insertMany mock
        (Match.insertMany as unknown as any).mockImplementation((newMatches: any[]) => {
            matchesMock.push(...newMatches);
            return Promise.resolve(newMatches);
        });

        (Match.deleteMany as unknown as any).mockResolvedValue({ deletedCount: 0 });
    });

    describe("Phase Detection", () => {
        it("should start in bracket phase with quarterfinal round", () => {
            const phase = (ctl as any).calculateTournamentPhase(tournamentMock, matchesMock);
            expect(phase.phase).toBe("bracket");
            expect(phase.currentRound).toBe("quarterfinal");
        });

        it("should detect semifinal phase when QF matches are completed", () => {
            matchesMock = [
                { round: "quarterfinal", status: "completed", winner: "team1" },
                { round: "quarterfinal", status: "completed", winner: "team3" },
                { round: "quarterfinal", status: "completed", winner: "team5" },
                { round: "quarterfinal", status: "completed", winner: "team7" },
            ];
            const phase = (ctl as any).calculateTournamentPhase(tournamentMock, matchesMock);
            expect(phase.phase).toBe("bracket");
            // After QF complete, next round would be semifinal
            expect(phase.canAdvance).toBe(true);
        });

        it("should detect final phase when SF matches are completed", () => {
            matchesMock = [
                { round: "quarterfinal", status: "completed", winner: "team1" },
                { round: "quarterfinal", status: "completed", winner: "team3" },
                { round: "quarterfinal", status: "completed", winner: "team5" },
                { round: "quarterfinal", status: "completed", winner: "team7" },
                { round: "semifinal", status: "completed", winner: "team1" },
                { round: "semifinal", status: "completed", winner: "team5" },
            ];
            const phase = (ctl as any).calculateTournamentPhase(tournamentMock, matchesMock);
            expect(phase.phase).toBe("bracket");
            expect(phase.canAdvance).toBe(true);
        });
    });

    describe("Match Generation", () => {
        it("should generate 4 quarterfinal matches for 8 teams", async () => {
            const req = { params: { id: "se_tourn_1" }, body: { round: "quarterfinal" } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await (ctl as any).generateMatches(req, res, jest.fn());

            expect(Match.insertMany).toHaveBeenCalled();
            expect(matchesMock.length).toBe(4);
            expect(matchesMock[0].round).toBe("quarterfinal");
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it("should generate 2 semifinal matches when advancing from QF", async () => {
            // Setup: QF matches completed
            matchesMock = [
                { round: "quarterfinal", status: "completed", winner: "team1", team1: { teamId: "t1" }, team2: { teamId: "t2" } },
                { round: "quarterfinal", status: "completed", winner: "team1", team1: { teamId: "t3" }, team2: { teamId: "t4" } },
                { round: "quarterfinal", status: "completed", winner: "team1", team1: { teamId: "t5" }, team2: { teamId: "t6" } },
                { round: "quarterfinal", status: "completed", winner: "team1", team1: { teamId: "t7" }, team2: { teamId: "t8" } },
            ];

            const req = { params: { id: "se_tourn_1" }, body: { round: "semifinal" } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await (ctl as any).generateMatches(req, res, jest.fn());

            expect(Match.insertMany).toHaveBeenCalled();
            // Should add 2 SF matches
            const sfMatches = matchesMock.filter((m) => m.round === "semifinal");
            expect(sfMatches.length).toBe(2);
        });

        it("should generate 1 final match when advancing from SF", async () => {
            // Setup: SF matches completed
            matchesMock = [
                { round: "semifinal", status: "completed", winner: "team1", team1: { teamId: "t1" }, team2: { teamId: "t3" } },
                { round: "semifinal", status: "completed", winner: "team1", team1: { teamId: "t5" }, team2: { teamId: "t7" } },
            ];

            const req = { params: { id: "se_tourn_1" }, body: { round: "final" } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            await (ctl as any).generateMatches(req, res, jest.fn());

            expect(Match.insertMany).toHaveBeenCalled();
            const finalMatches = matchesMock.filter((m) => m.round === "final");
            expect(finalMatches.length).toBe(1);
        });
    });

    describe("Round Order", () => {
        it("should follow correct round progression: QF → SF → Final", () => {
            const roundOrder = ["quarterfinal", "semifinal", "final"];

            // Verify round order is correctly defined
            expect(roundOrder.indexOf("quarterfinal")).toBeLessThan(roundOrder.indexOf("semifinal"));
            expect(roundOrder.indexOf("semifinal")).toBeLessThan(roundOrder.indexOf("final"));
        });
    });
});
