import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import TournamentFilters from "../TournamentFilters";

describe("TournamentFilters", () => {
  const defaultProps = {
    sortField: "date" as const,
    sortDirection: "desc" as const,
    onSortChange: vi.fn(),
    yearFilter: null,
    onYearChange: vi.fn(),
    formatFilter: null,
    onFormatChange: vi.fn(),
    statusFilter: null,
    onStatusChange: vi.fn(),
    viewMode: "table" as const,
    onViewModeChange: vi.fn(),
    availableYears: [2023, 2024],
  };

  const renderWithRouter = (props = defaultProps) => {
    return render(
      <MemoryRouter>
        <TournamentFilters {...props} />
      </MemoryRouter>
    );
  };

  it("should render filter controls", () => {
    renderWithRouter();
    // Use exact match for labels with selector to avoid matching options
    expect(screen.getByText(/^Year$/i, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/^Format$/i, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/^Status$/i, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/^Sort$/i, { selector: 'label' })).toBeInTheDocument();
  });

  it("should call onYearChange when year filter changes", () => {
    const onYearChange = vi.fn();
    renderWithRouter({ ...defaultProps, onYearChange });

    const yearSelect = screen.getByLabelText(/^Year$/i);
    fireEvent.change(yearSelect, { target: { value: "2024" } });

    expect(onYearChange).toHaveBeenCalledWith(2024);
  });

  it("should call onFormatChange when format filter changes", () => {
    const onFormatChange = vi.fn();
    renderWithRouter({ ...defaultProps, onFormatChange });

    const formatSelect = screen.getByLabelText(/^Format$/i);
    fireEvent.change(formatSelect, { target: { value: "M" } });

    expect(onFormatChange).toHaveBeenCalledWith("M");
  });

  it("should call onStatusChange when status filter changes", () => {
    const onStatusChange = vi.fn();
    renderWithRouter({ ...defaultProps, onStatusChange });

    const statusSelect = screen.getByLabelText(/^Status$/i);
    fireEvent.change(statusSelect, { target: { value: "completed" } });

    expect(onStatusChange).toHaveBeenCalledWith("completed");
  });

  it("should call onSortChange when sort field changes", () => {
    const onSortChange = vi.fn();
    renderWithRouter({ ...defaultProps, onSortChange });

    const sortSelect = screen.getByLabelText(/^Sort$/i);
    fireEvent.change(sortSelect, { target: { value: "playerCount" } });

    expect(onSortChange).toHaveBeenCalledWith("playerCount", "desc");
  });

  it("should toggle sort direction when sort button clicked", () => {
    const onSortChange = vi.fn();
    renderWithRouter({ ...defaultProps, onSortChange, sortDirection: "desc" });

    const sortButton = screen.getByTitle(/Descending/i);
    fireEvent.click(sortButton);

    expect(onSortChange).toHaveBeenCalledWith("date", "asc");
  });

  it("should call onViewModeChange when view mode button clicked", () => {
    const onViewModeChange = vi.fn();
    renderWithRouter({ ...defaultProps, onViewModeChange, viewMode: "table" });

    const cardViewButton = screen.getByTitle(/Card View/i);
    fireEvent.click(cardViewButton);

    expect(onViewModeChange).toHaveBeenCalledWith("cards");
  });
});
