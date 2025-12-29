import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import PlayerCreate from "../PlayerCreate";
import apiClient from "../../services/api";

// Mock dependencies
vi.mock("../../hooks/useApi", () => ({
    useApi: vi.fn(),
    useMutation: vi.fn(),
}));

vi.mock("../../services/api", () => ({
    default: {
        createPlayer: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

import { useMutation } from "../../hooks/useApi";

describe("PlayerCreate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for useMutation
        vi.mocked(useMutation).mockImplementation((fn, options) => {
            const [state, setState] = React.useState({ data: null, loading: false, error: null as string | null });
            const mutate = async (data: any) => {
                setState({ data: null, loading: true, error: null });
                try {
                    const result = await fn(data);
                    setState({ data: result.data || null, loading: false, error: null });
                    if (options?.onSuccess) options.onSuccess(result);
                } catch (err: any) {
                    const error = err.message || "An error occurred";
                    setState({ data: null, loading: false, error });
                    if (options?.onError) options.onError(error);
                }
            };
            return { ...state, mutate };
        });
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it("should render create player form", () => {
        renderWithRouter(<PlayerCreate />);
        expect(screen.getByText(/New Player/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    });

    it("should call API and navigate on success", async () => {
        vi.mocked(apiClient.createPlayer).mockResolvedValue({ success: true } as any);
        renderWithRouter(<PlayerCreate />);

        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "John Doe" } });
        fireEvent.change(screen.getByLabelText(/Usual Partner/i), { target: { value: "Jane Smith" } });

        fireEvent.click(screen.getByRole("button", { name: /Create Player/i }));

        await waitFor(() => {
            expect(apiClient.createPlayer).toHaveBeenCalledWith(expect.objectContaining({
                name: "John Doe",
                pairing: "Jane Smith",
            }));
            expect(mockNavigate).toHaveBeenCalledWith("/players");
        });
    });

    it("should show error on API failure", async () => {
        vi.mocked(apiClient.createPlayer).mockRejectedValue(new Error("Database Error"));
        renderWithRouter(<PlayerCreate />);

        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "John Doe" } });
        fireEvent.click(screen.getByRole("button", { name: /Create Player/i }));

        await waitFor(() => {
            expect(screen.getByText(/Error: Database Error/i)).toBeInTheDocument();
        });
    });
});
