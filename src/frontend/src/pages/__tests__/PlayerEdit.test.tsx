import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PlayerEdit from "../PlayerEdit";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useParams: () => ({ id: "player-123" }),
    };
});

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ id: "player-123" }),
    };
});

vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn(),
    useMutation: vi.fn().mockImplementation((fn, options) => ({
        mutate: async (data: any) => {
            try {
                const result = await fn(data);
                if (options?.onSuccess) options.onSuccess(result);
                return result;
            } catch (err) {
                if (options?.onError) options.onError(err);
                throw err;
            }
        },
        loading: false,
        error: null,
    })),
}));

vi.mock("../../services/api", () => ({
    default: {
        getPlayer: vi.fn(),
        updatePlayer: vi.fn(),
    },
}));

import { useApi } from "../../hooks/useApi";
const mockUseApi = useApi as ReturnType<typeof vi.fn>;

describe("PlayerEdit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should show loading state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: true,
            error: null,
        });

        renderWithRouter(<PlayerEdit />);
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should show error state", () => {
        mockUseApi.mockReturnValue({
            data: null,
            loading: false,
            error: "Player not found",
        });

        renderWithRouter(<PlayerEdit />);
        expect(screen.getByText(/Error loading player/i)).toBeInTheDocument();
    });

    it("should render edit form with player data", async () => {
        const mockPlayer = {
            id: "player-123",
            name: "John Doe",
            pairing: "Jane Smith",
            winningPercentage: 0.75,
            isActive: true,
        };

        mockUseApi.mockReturnValue({
            data: mockPlayer,
            loading: false,
            error: null,
        });

        renderWithRouter(<PlayerEdit />);

        expect(screen.getByText(/Edit Player/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    });

    it("should call API and navigate on success", async () => {
        const mockPlayer = {
            id: "player-123",
            name: "John Doe",
        };
        mockUseApi.mockReturnValue({
            data: mockPlayer,
            loading: false,
            error: null,
        });
        vi.mocked(apiClient.updatePlayer).mockResolvedValue({ success: true } as any);

        renderWithRouter(<PlayerEdit />);

        const nameInput = screen.getByDisplayValue("John Doe");
        fireEvent.change(nameInput, { target: { value: "John Updated" } });

        fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

        await waitFor(() => {
            expect(apiClient.updatePlayer).toHaveBeenCalledWith("player-123", expect.objectContaining({
                name: "John Updated",
            }));
            expect(mockNavigate).toHaveBeenCalledWith("/players/player-123");
        });
    });
});
