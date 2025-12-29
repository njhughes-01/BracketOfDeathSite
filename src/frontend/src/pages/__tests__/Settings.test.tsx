import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsPage from "../admin/Settings";
import apiClient from "../../services/api";

// Mock API
vi.mock("../../services/api", () => ({
    default: {
        getSystemSettings: vi.fn(),
        updateSystemSettings: vi.fn(),
        verifyEmailCredentials: vi.fn(),
        testEmail: vi.fn(),
    },
}));

describe("SettingsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should show loading state", () => {
        vi.mocked(apiClient.getSystemSettings).mockReturnValue(new Promise(() => { })); // Never resolves
        render(<SettingsPage />);
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should render settings page title", async () => {
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText((content, element) => {
                return element?.tagName.toLowerCase() === 'h1' && /System.*Settings/i.test(element.textContent || '');
            })).toBeInTheDocument();
        });
    });

    it("should show Mailjet configuration by default", async () => {
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Mailjet Configuration/i)).toBeInTheDocument();
            expect(screen.getByText(/API Key/i)).toBeInTheDocument();
        });
    });

    it("should show status as Not Configured when new", async () => {
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: false,
            mailgunConfigured: false,
        } as any);

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Not Configured/i)).toBeInTheDocument();
        });
    });

    it("should show status as Active when configured", async () => {
        vi.mocked(apiClient.getSystemSettings).mockResolvedValue({
            activeProvider: "mailjet",
            mailjetConfigured: true,
            mailgunConfigured: false,
        } as any);

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText(/Active/i)).toBeInTheDocument();
            expect(screen.getByText(/Mailjet Configured/i)).toBeInTheDocument();
        });
    });
});
