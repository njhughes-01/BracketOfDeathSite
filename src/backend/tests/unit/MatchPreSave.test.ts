import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Match } from "../../models/Match";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Match.deleteMany({});
});

const createTestMatch = (overrides: any = {}) => ({
  tournamentId: new mongoose.Types.ObjectId(),
  matchNumber: 1,
  round: "RR_R1",
  roundNumber: 1,
  team1: {
    players: [new mongoose.Types.ObjectId()],
    playerNames: ["Player 1"],
    score: 0,
  },
  team2: {
    players: [new mongoose.Types.ObjectId()],
    playerNames: ["Player 2"],
    score: 0,
  },
  status: "scheduled",
  ...overrides,
});

describe("Match pre-save hook - calculateMatchStats", () => {
  it("should NOT auto-complete when status is explicitly set to in-progress even with non-tied scores", async () => {
    // Create a match first
    const match = await Match.create(createTestMatch());

    // Now update it with scores and explicit in-progress status (simulating Save button)
    match.team1.score = 6;
    match.team2.score = 3;
    match.status = "in-progress";

    const saved = await match.save();

    // The pre-save hook should NOT override the explicit in-progress status
    expect(saved.status).toBe("in-progress");
    expect(saved.winner).toBeUndefined();
  });

  it("should auto-complete when status transitions to in-progress without being explicitly set (e.g., from auto-detection)", async () => {
    // Create a match that's already in-progress
    const match = await Match.create(
      createTestMatch({ status: "in-progress" }),
    );

    // Clear the modified state by doing a fresh find
    const freshMatch = await Match.findById(match._id);
    if (!freshMatch) throw new Error("Match not found");

    // Update only scores (no explicit status change) - status is already in-progress
    freshMatch.team1.score = 6;
    freshMatch.team2.score = 3;
    // NOT setting freshMatch.status — it's already "in-progress" from DB

    const saved = await freshMatch.save();

    // The pre-save hook SHOULD auto-complete because status was NOT explicitly modified
    expect(saved.status).toBe("completed");
    expect(saved.winner).toBe("team1");
  });

  it("should auto-determine winner from scores in pre-save hook", async () => {
    const match = await Match.create(createTestMatch({ status: "in-progress" }));

    const freshMatch = await Match.findById(match._id);
    if (!freshMatch) throw new Error("Match not found");

    freshMatch.team1.score = 3;
    freshMatch.team2.score = 6;

    const saved = await freshMatch.save();

    expect(saved.winner).toBe("team2");
    expect(saved.status).toBe("completed");
  });

  it("should NOT set winner when scores are tied", async () => {
    const match = await Match.create(createTestMatch({ status: "in-progress" }));

    const freshMatch = await Match.findById(match._id);
    if (!freshMatch) throw new Error("Match not found");

    freshMatch.team1.score = 4;
    freshMatch.team2.score = 4;

    const saved = await freshMatch.save();

    // No winner for tied scores, status should remain in-progress
    expect(saved.winner).toBeUndefined();
    expect(saved.status).toBe("in-progress");
  });
});
