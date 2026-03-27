import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi, useMutation } from "../hooks/useApi";
import apiClient from "../services/api";
import { LoadingSpinner, Heading, Text, Button, Input, Select, Textarea, FormField, Stack, Container, ResponsiveGrid } from "../components/ui";
import type { TournamentInput } from "../types/api";

const TournamentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TournamentInput>({
    date: "",
    bodNumber: 0,
    format: "Mixed",
    location: "",
    advancementCriteria: "",
    notes: "",
    photoAlbums: "",
    status: "scheduled",
    maxPlayers: 16,
    registrationType: "open",
  });

  // Fetch Tournament Data
  const {
    data: tournament,
    loading: fetchLoading,
    error: fetchError,
  } = useApi(() => apiClient.getTournament(id!), { immediate: true });

  // Update Form when data loads
  useEffect(() => {
    if (tournament) {
      const t = tournament as any;
      setFormData({
        date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
        bodNumber: t.bodNumber || 0,
        format: t.format || "Mixed",
        location: t.location || "",
        advancementCriteria: t.advancementCriteria || "",
        notes: t.notes || "",
        photoAlbums: t.photoAlbums || "",
        status: t.status || "scheduled",
        maxPlayers: t.maxPlayers || 16,
        registrationType: t.registrationType || "open",
      });
    }
  }, [tournament]);

  // Mutation for Update
  const {
    mutate: updateTournament,
    loading: saveLoading,
    error: saveError,
  } = useMutation(
    (data: TournamentInput) => apiClient.updateTournament(id!, data),
    {
      onSuccess: () => navigate(`/tournaments/${id}`),
    },
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "number" ? (value === "" ? 0 : parseFloat(value)) : value,
    } as TournamentInput));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTournament(formData);
  };

  const formatOptions = [
    { value: "M", label: "Men's" },
    { value: "W", label: "Women's" },
    { value: "Mixed", label: "Mixed" },
    { value: "Men's Singles", label: "Men's Singles" },
    { value: "Men's Doubles", label: "Men's Doubles" },
    { value: "Women's Doubles", label: "Women's Doubles" },
    { value: "Mixed Doubles", label: "Mixed Doubles" },
  ];

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchError || !tournament) {
    return (
      <div className="p-8 text-center bg-background-dark min-h-screen text-white">
        <Heading level={2} className="!text-xl mb-4">Error loading tournament</Heading>
        <Button variant="ghost" onClick={() => navigate("/tournaments")}>
          Return to Tournaments
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <Stack direction="horizontal" gap={3} align="center">
          <Button
            variant="ghost"
            onClick={() => navigate(`/tournaments/${id}`)}
            icon="arrow_back"
            className="-ml-2"
          />
          <Heading level={1} className="!text-xl">Edit Tournament</Heading>
        </Stack>
      </div>

      <Container padding="md" maxWidth="sm" className="flex-1">
        <form onSubmit={handleSubmit}>
          <Stack direction="vertical" gap={6}>
            <div>
              <Text size="xs" className="font-bold text-slate-500 uppercase tracking-wider pl-1 mb-4">
                Details
              </Text>

              <Stack direction="vertical" gap={4}>
                <ResponsiveGrid cols={{ base: 2 }} gap={3}>
                  <FormField label="Date">
                    <Input
                      type="date"
                      name="date"
                      value={formData.date as string}
                      onChange={handleChange}
                      required
                    />
                  </FormField>
                  <FormField label="BOD #">
                    <Input
                      type="number"
                      name="bodNumber"
                      value={formData.bodNumber}
                      onChange={handleChange}
                      required
                    />
                  </FormField>
                </ResponsiveGrid>

                <FormField label="Location">
                  <Input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </FormField>

                <FormField label="Format">
                  <Select
                    name="format"
                    value={formData.format}
                    onChange={handleChange}
                  >
                    {formatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Status">
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="open">Open</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </FormField>

                <FormField label="Advancement Criteria">
                  <Textarea
                    name="advancementCriteria"
                    value={formData.advancementCriteria}
                    onChange={handleChange}
                    rows={2}
                  />
                </FormField>

                <FormField label="Notes">
                  <Textarea
                    name="notes"
                    value={formData.notes || ""}
                    onChange={handleChange}
                    rows={3}
                  />
                </FormField>

                <FormField label="Photo Album URL">
                  <Input
                    type="text"
                    name="photoAlbums"
                    value={formData.photoAlbums || ""}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </FormField>
              </Stack>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                Error saving: {saveError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={saveLoading}
              className="py-4 text-lg shadow-lg shadow-primary/20"
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </form>
      </Container>
    </div>
  );
};

export default TournamentEdit;
