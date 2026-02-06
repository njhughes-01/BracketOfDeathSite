import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import SettingsPage from "../admin/Settings";
import apiClient from "../../services/api";

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Mock API
vi.mock("../../services/api", () => ({
    default: {
        getSystemSettings: vi.fn(),
        updateSystemSettings: vi.fn(),
        verifyEmailCredentials: vi.fn(),
        testEmail: vi.fn(),
        isEmailConfigured: vi.fn(),
    },
}));

describe("SettingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should show loading state", () => {
        vi.mocked(apiClient.isEmailConfigured).mockReturnValue(new Promise(() => { })); // Never resolves
        vi.mocked(apiClient.getSystemSettings).mockReturnValue(new Promise(() => { })); // Never resolves
        renderWithRouter(<SettingsPage />);
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should render settings page title", async () => {
        vi.mocked(apiClient.isEmailConfigured).mockResolvedValue({ configured: false, source: null });
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        renderWithRouter(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText((content, element) => {
                return element?.tagName.toLowerCase() === 'h1' && /System.*Settings/i.test(element.textContent || '');
            })).toBeInTheDocument();
        });
    });

    it("should show Mailjet configuration by default", async () => {
        vi.mocked(apiClient.isEmailConfigured).mockResolvedValue({ configured: false, source: null });
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        renderWithRouter(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Mailjet Configuration/i)).toBeInTheDocument();
            expect(screen.getByText(/API Key/i)).toBeInTheDocument();
        });
    });

    it("should show status as Not Configured when new", async () => {
        vi.mocked(apiClient.isEmailConfigured).mockResolvedValue({ configured: false, source: null });
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        renderWithRouter(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Not Configured/i)).toBeInTheDocument();
        });
    });

    it("should show status as Active when configured via database", async () => {
        vi.mocked(apiClient.isEmailConfigured).mockResolvedValue({ configured: true, source: "database", provider: "mailjet" });
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: true,
            mailgunConfigured: false,
        } as any);

        renderWithRouter(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Active/i)).toBeInTheDocument();
            expect(screen.getByText(/Mailjet Configured/i)).toBeInTheDocument();
        });
    });

    it("should show env var banner when configured via environment", async () => {
        vi.mocked(apiClient.isEmailConfigured).mockResolvedValue({ 
            configured: true, 
            source: "environment", 
            provider: "mailgun",
            message: "Email is configured via environment variables."
        });
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailgun",
            mailjetConfigured: false,
            mailgunConfigured: true,
            emailConfigSource: "environment",
        } as any);

        renderWithRouter(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Configured via Environment Variables/i)).toBeInTheDocument();
            expect(screen.getByText(/Mailgun Configured/i)).toBeInTheDocument();
        });
    });
});
