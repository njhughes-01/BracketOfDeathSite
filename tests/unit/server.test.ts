import request from "supertest";
import app from "../../src/backend/server";

describe("Server", () => {
  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for non-existent routes", async () => {
      const response = await request(app)
        .get("/non-existent-route")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Not Found");
    });
  });

  describe("CORS", () => {
    it("should set CORS headers", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });
  });

  describe("Security Headers", () => {
    it("should set security headers", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-frame-options");
    });
  });
});
