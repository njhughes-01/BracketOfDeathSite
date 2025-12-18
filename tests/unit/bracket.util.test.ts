import {
  getDefaultRoundFor,
  getRoundOptions,
} from "../../src/frontend/src/utils/bracket";

describe("bracket utils", () => {
  test("default round for round robin playoff is RR_R1", () => {
    expect(getDefaultRoundFor("round_robin_playoff")).toBe("RR_R1");
  });

  test("default round for single elimination is quarterfinal", () => {
    expect(getDefaultRoundFor("single_elimination")).toBe("quarterfinal");
  });

  test("round options for single elimination exclude RR rounds", () => {
    const opts = getRoundOptions("single_elimination").map((o) => o.value);
    expect(opts).toEqual(["quarterfinal", "semifinal", "final"]);
  });

  test("round options for round robin playoff include RR rounds", () => {
    const opts = getRoundOptions("round_robin_playoff").map((o) => o.value);
    expect(opts).toEqual([
      "RR_R1",
      "RR_R2",
      "RR_R3",
      "quarterfinal",
      "semifinal",
      "final",
    ]);
  });
});
