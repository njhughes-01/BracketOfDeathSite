import { KeycloakAdminService } from "../../services/keycloakAdminService";

// Mock Axios
const mockAxios = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn()
};

describe("KeycloakAdminService", () => {
    let service: KeycloakAdminService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Inject mock axios
        service = new KeycloakAdminService(mockAxios as any);

        // Default auth token response
        mockAxios.post.mockResolvedValue({
            data: { access_token: "fake-token", expires_in: 300 }
        });
    });

    it("should authenticate and get token", async () => {
        // We can't directly test private getAdminToken, but public methods triggers it
        mockAxios.request.mockResolvedValue({ data: [] });
        await service.getUsers();

        expect(mockAxios.post).toHaveBeenCalledWith(
            expect.stringContaining("/token"),
            expect.anything(),
            expect.anything()
        );
    });

    it("should create a user successfully", async () => {
        const userData = { username: "testuser", email: "test@example.com" };

        // Mock create response
        mockAxios.request.mockImplementation((config) => {
            if (config.method === "POST" && config.url === "/users") {
                return Promise.resolve({
                    headers: { location: "http://keycloak/users/user-123" }
                });
            }
            if (config.method === "GET" && config.url === "/users/user-123") {
                return Promise.resolve({ data: { id: "user-123", username: "testuser" } });
            }
            if (config.method === "GET" && config.url.includes("role-mappings")) {
                return Promise.resolve({ data: [] });
            }
            if (config.method === "PUT") {
                return Promise.resolve({ data: {} });
            }
            return Promise.reject("Unknown URL");
        });

        const user = await service.createUser(userData);

        expect(user.id).toBe("user-123");
        expect(user.username).toBe("testuser");
    });

    it("should assign roles to user", async () => {
        const userId = "user-123";
        const roles = ["admin"];

        // Mock roles fetch
        mockAxios.request.mockImplementation((config) => {
            if (config.url === "/roles" && config.method === "GET") {
                return Promise.resolve({ data: [{ id: "r1", name: "admin" }, { id: "r2", name: "user" }] });
            }
            if (config.method === "POST" && config.url.includes("role-mappings")) {
                return Promise.resolve({ data: {} });
            }
            // Auth token call
            return Promise.resolve({ data: { access_token: "t" } });
        });

        await service.assignRolesToUser(userId, roles);

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: "POST",
            url: `/users/${userId}/role-mappings/realm`,
            data: [{ id: "r1", name: "admin" }]
        }));
    });
});
