import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ClaimUserModal from "../ClaimUserModal";
import apiClient from "../../../services/api";

// Mock API
vi.mock("../../../services/api", () => ({
    default: {
        claimUser: vi.fn(),
        searchPlayers: vi.fn(),
    },
}));

describe("ClaimUserModal", () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    const renderModal = () => {
        return render(
            <BrowserRouter>
                <ClaimUserModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
            </BrowserRouter>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the modal content", () => {
        renderModal();
        expect(screen.getByText("Claim Profile")).toBeInTheDocument();
        expect(screen.getByText("EMAIL ADDRESS")).toBeInTheDocument();
        expect(screen.getByText("SELECT PLAYER")).toBeInTheDocument();
    });

    it("should close when close button is clicked", () => {
        renderModal();
        const closeButton = screen.getByText("close"); // material symbol text
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("should search for players and allow selection", async () => {
        const mockPlayers = [{ id: "p1", name: "John Doe", _id: "p1" }];
        (apiClient.searchPlayers as any).mockResolvedValue({ success: true, data: mockPlayers });

        renderModal();

        const searchInput = screen.getByPlaceholderText("Search player name...");
        fireEvent.change(searchInput, { target: { value: "John" } });

        await waitFor(() => {
            expect(apiClient.searchPlayers).toHaveBeenCalledWith("John");
        });

        // Click the player from the list
        const playerOption = await screen.findByText("John Doe");
        fireEvent.click(playerOption);

        // Should now show the selected player
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        // Search input should be gone
        expect(screen.queryByPlaceholderText("Search player name...")).not.toBeInTheDocument();
    });

    it("should submit the form when valid", async () => {
        const mockPlayers = [{ id: "p1", name: "John Doe", _id: "p1" }];
        (apiClient.searchPlayers as any).mockResolvedValue({ success: true, data: mockPlayers });
        (apiClient.claimUser as any).mockResolvedValue({ success: true });

        renderModal();

        // Enter email
        const emailInput = screen.getByPlaceholderText("user@example.com");
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });

        // Search and select player
        const searchInput = screen.getByPlaceholderText("Search player name...");
        fireEvent.change(searchInput, { target: { value: "John" } });
        const playerOption = await screen.findByText("John Doe");
        fireEvent.click(playerOption);

        // Submit
        const submitButton = screen.getByText(/Send Invitation/i);
        // Initially disabled? No, assuming valid input
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(apiClient.claimUser).toHaveBeenCalledWith("test@example.com", "p1");
        });

        // Should show success state
        expect(await screen.findByText("Invitation Sent!")).toBeInTheDocument();
    });

    it("should call onSuccess when Done is clicked after success", async () => {
        const mockPlayers = [{ id: "p1", name: "John Doe", _id: "p1" }];
        (apiClient.searchPlayers as any).mockResolvedValue({ success: true, data: mockPlayers });
        (apiClient.claimUser as any).mockResolvedValue({ success: true });

        renderModal();

        // Setup valid state
        fireEvent.change(screen.getByPlaceholderText("user@example.com"), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("Search player name..."), { target: { value: "John" } });
        fireEvent.click(await screen.findByText("John Doe"));

        fireEvent.click(screen.getByText(/Send Invitation/i));

        const doneButton = await screen.findByText("Done");
        fireEvent.click(doneButton);

        expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("should display error on failure", async () => {
        const mockPlayers = [{ id: "p1", name: "John Doe", _id: "p1" }];
        (apiClient.searchPlayers as any).mockResolvedValue({ success: true, data: mockPlayers });
        (apiClient.claimUser as any).mockResolvedValue({ success: false, error: "Failed to send" });

        renderModal();

        // Setup valid state
        fireEvent.change(screen.getByPlaceholderText("user@example.com"), { target: { value: "test@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("Search player name..."), { target: { value: "John" } });
        fireEvent.click(await screen.findByText("John Doe"));

        fireEvent.click(screen.getByText(/Send Invitation/i));

        expect(await screen.findByText("Failed to send")).toBeInTheDocument();
    });
});
