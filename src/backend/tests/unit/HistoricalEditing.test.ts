import { Request, Response } from "express";
import { LiveTournamentController } from "../../controllers/LiveTournamentController";
import { Tournament } from "../../models/Tournament";
import { Match } from "../../models/Match";
import { TournamentResult } from "../../models/TournamentResult";

// Mock dependencies
jest.mock("../../models/Tournament");
jest.mock("../../models/Match");
jest.mock("../../models/TournamentResult");
jest.mock("../../services/LiveStatsService");
jest.mock("../../services/EventBus");

describe("LiveTournamentController - Historical Data", () => {
    let controller: LiveTournamentController;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextMock: jest.Mock;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        controller = new LiveTournamentController();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        nextMock = jest.fn();
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });

    describe("Historical Tournament Detection", () => {
        it("should identify a historical tournament with results but no matches as COMPLETED", async () => {
            mockReq = { params: { id: "t1" } };

            // Setup mock data for a historical tournament
            // Note: the getLiveTournament uses Tournament.findById().populate().lean()
            const mockTournament = {
                _id: "t1",
                status: "active", // Historical often stuck in active or scheduled
                bracketType: "single_elimination",
                bodNumber: 27,
                date: new Date(),
                format: "M",
                location: "Test",
                advancementCriteria: "Wins",
                players: [],
                maxPlayers: 16,
                generatedTeams: [],
                // toObject not needed for lean() result
            };

            // Mock Tournament.findById chain: findById().populate().lean()
            (Tournament.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockTournament)
                }),
            });

            // No matches exist
            (Match.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([])
                })
            });

            // Results exist (indicating it was played)
            const mockResults = [
                { totalStats: { finalRank: 1 }, players: [] },
                { totalStats: { finalRank: 2 }, players: [] }
            ];

            (TournamentResult.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockResults)
                })
            });

            await controller.getLiveTournament(mockReq as Request, mockRes as Response, nextMock);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalled();
            const responseData = jsonMock.mock.calls[0][0];

            expect(responseData.success).toBe(true);
            // This is the core assertion: should be completed because results exist
            expect(responseData.data.phase.phase).toBe("completed");
            expect(responseData.data.phase.roundStatus).toBe("completed");
        });
    });
});
