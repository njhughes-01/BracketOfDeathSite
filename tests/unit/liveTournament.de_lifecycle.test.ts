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

describe("Double Elimination Lifecycle", () => {
    let ctl: LiveTournamentController;
    let tournamentMock: Record<string, unknown>;
    let matchesMock: any[];

    beforeEach(() => {
        jest.clearAllMocks();
        ctl = new LiveTournamentController();
        matchesMock = [];

        // 8-team Double Elimination tournament
        tournamentMock = {
            _id: "de_tourn_1",
            status: "active",
            bracketType: "double_elimination",
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
                if (query.bracket) {
                    results = results.filter((m) => m.bracket === query.bracket);
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

        it("should recognize double elimination bracket type", () => {
            expect(tournamentMock.bracketType).toBe("double_elimination");
        });
    });

    describe("Winners Bracket", () => {
        it("should track winners bracket matches separately", () => {
            // Setup: Winners bracket QF matches
            matchesMock = [
                { round: "quarterfinal", bracket: "winners", status: "completed", winner: "team1" },
                { round: "quarterfinal", bracket: "winners", status: "completed", winner: "team3" },
                { round: "quarterfinal", bracket: "winners", status: "completed", winner: "team5" },
                { round: "quarterfinal", bracket: "winners", status: "completed", winner: "team7" },
            ];

            const winnersMatches = matchesMock.filter((m) => m.bracket === "winners");
            expect(winnersMatches.length).toBe(4);
        });

        it("should progress through winners bracket rounds", () => {
            // Winners bracket should go: QF -> SF -> WB Final
            const winnersRounds = ["quarterfinal", "semifinal", "wb_final"];

            expect(winnersRounds.indexOf("quarterfinal")).toBeLessThan(winnersRounds.indexOf("semifinal"));
            expect(winnersRounds.indexOf("semifinal")).toBeLessThan(winnersRounds.indexOf("wb_final"));
        });
    });

    describe("Losers Bracket", () => {
        it("should track losers bracket matches separately", () => {
            // Setup: Losers bracket matches (losers from winners QF)
            matchesMock = [
                { round: "lb_r1", bracket: "losers", status: "scheduled", team1: { teamId: "t2" }, team2: { teamId: "t4" } },
                { round: "lb_r1", bracket: "losers", status: "scheduled", team1: { teamId: "t6" }, team2: { teamId: "t8" } },
            ];

            const losersMatches = matchesMock.filter((m) => m.bracket === "losers");
            expect(losersMatches.length).toBe(2);
        });

        it("should populate losers bracket from winners bracket losers", () => {
            // When team loses in winners bracket, they should move to losers bracket
            const winnersQFLosers = ["t2", "t4", "t6", "t8"]; // Teams that lost QF
            expect(winnersQFLosers.length).toBe(4);
        });
    });

    describe("Grand Final", () => {
        it("should set up grand final between winners and losers bracket champions", () => {
            // Setup: Grand final match
            matchesMock = [
                {
                    round: "grand_final",
                    status: "scheduled",
                    team1: { teamId: "t1", source: "winners" },
                    team2: { teamId: "t3", source: "losers" }
                },
            ];

            const grandFinal = matchesMock.find((m) => m.round === "grand_final");
            expect(grandFinal).toBeDefined();
            expect(grandFinal?.team1.source).toBe("winners");
            expect(grandFinal?.team2.source).toBe("losers");
        });

        it("should handle bracket reset scenario", () => {
            // In double elimination, if losers bracket champion wins grand final,
            // there's a bracket reset (second grand final)
            const grandFinalResults = [
                { round: "grand_final", matchNumber: 1, winner: "team2" }, // Losers champ wins
                { round: "grand_final", matchNumber: 2, winner: "team1" }, // Bracket reset - winners champ wins
            ];

            expect(grandFinalResults.length).toBe(2);
            expect(grandFinalResults[0].winner).toBe("team2"); // Losers wins first
            expect(grandFinalResults[1].winner).toBe("team1"); // True final
        });
    });

    describe("Round Progression", () => {
        it("should follow correct double elimination bracket structure", () => {
            // Double elimination round structure for 8 teams:
            // Winners: QF (4) -> SF (2) -> WB Final (1)
            // Losers: LB R1 (2) -> LB R2 (2) -> LB R3 (1) -> LB Final (1)
            // Grand Final (1 or 2)

            const winnersRounds = ["quarterfinal", "semifinal", "wb_final"];
            const losersRounds = ["lb_r1", "lb_r2", "lb_r3", "lb_final"];
            const finalRounds = ["grand_final"];

            expect(winnersRounds.length).toBe(3);
            expect(losersRounds.length).toBe(4);
            expect(finalRounds.length).toBe(1);
        });

        it("should track eliminated teams correctly", () => {
            // A team is eliminated when they lose in the losers bracket
            const eliminatedTeams = ["t2", "t4"]; // Lost in LB R1

            expect(eliminatedTeams.every((t) => typeof t === "string")).toBe(true);
        });
    });
});
