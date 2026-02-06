import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logger from "../../utils/logger";
import apiClient from "../../services/api";
import type {
  DiscountCode,
  DiscountCodeInput,
  DiscountCodeUpdate,
  Tournament,
} from "../../services/api";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1c2230] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400">
              close
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const DiscountCodesPage: React.FC = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [modalError, setModalError] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"percent" | "amount">("percent");
  const [formValue, setFormValue] = useState("");
  const [formMaxRedemptions, setFormMaxRedemptions] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formTournamentIds, setFormTournamentIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [codesResponse, tournamentsResponse] = await Promise.all([
        apiClient.getDiscountCodes({ includeExpired: true }),
        apiClient.getTournaments({ limit: 50, sort: "-date" }),
      ]);

      setCodes(codesResponse.data?.codes || []);
      setTournaments(tournamentsResponse.data || []);
    } catch (err: any) {
      logger.error(err);
      setError(err.response?.data?.error || "Failed to load discount codes");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormType("percent");
    setFormValue("");
    setFormMaxRedemptions("");
    setFormExpiresAt("");
    setFormTournamentIds([]);
    setModalError("");
    setEditingCode(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setIsModalOpen(true);
  };

  const openEditModal = (code: DiscountCode) => {
    setEditingCode(code);
    setFormCode(code.code);
    setFormType(code.type);
    setFormValue(
      code.type === "percent"
        ? String(code.percentOff || "")
        : String((code.amountOff || 0) / 100)
    );
    setFormMaxRedemptions(
      code.maxRedemptions != null ? String(code.maxRedemptions) : ""
    );
    setFormExpiresAt(
      code.expiresAt
        ? new Date(code.expiresAt).toISOString().slice(0, 16)
        : ""
    );
    setFormTournamentIds(code.tournamentIds || []);
    setModalError("");
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setModalSaving(true);
      setModalError("");

      if (modalMode === "create") {
        const data: DiscountCodeInput = {
          code: formCode.toUpperCase(),
          type: formType,
        };

        if (formType === "percent") {
          data.percentOff = parseFloat(formValue);
        } else {
          data.amountOff = Math.round(parseFloat(formValue) * 100);
        }

        if (formMaxRedemptions) {
          data.maxRedemptions = parseInt(formMaxRedemptions, 10);
        }

        if (formExpiresAt) {
          data.expiresAt = new Date(formExpiresAt).toISOString();
        }

        if (formTournamentIds.length > 0) {
          data.tournamentIds = formTournamentIds;
        }

        await apiClient.createDiscountCode(data);
        setSuccess("Discount code created successfully!");
      } else if (editingCode) {
        const data: DiscountCodeUpdate = {};

        if (formMaxRedemptions !== "") {
          data.maxRedemptions = parseInt(formMaxRedemptions, 10);
        } else {
          data.maxRedemptions = null;
        }

        if (formExpiresAt) {
          data.expiresAt = new Date(formExpiresAt).toISOString();
        } else {
          data.expiresAt = null;
        }

        data.tournamentIds = formTournamentIds;

        await apiClient.updateDiscountCode(editingCode._id, data);
        setSuccess("Discount code updated successfully!");
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      logger.error(err);
      setModalError(err.response?.data?.error || "Failed to save discount code");
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeactivate = async (code: DiscountCode) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate "${code.code}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError("");
      await apiClient.deactivateDiscountCode(code._id);
      setSuccess(`Discount code "${code.code}" deactivated`);
      await loadData();
    } catch (err: any) {
      logger.error(err);
      setError(err.response?.data?.error || "Failed to deactivate discount code");
    }
  };

  const formatValue = (code: DiscountCode): string => {
    if (code.type === "percent") {
      return `${code.percentOff}%`;
    }
    return `$${((code.amountOff || 0) / 100).toFixed(2)}`;
  };

  const formatRedemptions = (code: DiscountCode): string => {
    const count = code.redemptionCount || 0;
    const max = code.maxRedemptions;
    if (max == null) {
      return `${count} / ∞`;
    }
    return `${count} / ${max}`;
  };

  const formatExpiry = (code: DiscountCode): string => {
    if (!code.expiresAt) {
      return "Never";
    }
    const date = new Date(code.expiresAt);
    const now = new Date();
    const isExpired = date < now;
    const formatted = date.toLocaleDateString();
    return isExpired ? `${formatted} (Expired)` : formatted;
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-96"
        data-testid="loading-spinner"
      >
        <LoadingSpinner size="lg" color="white" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic text-white tracking-tight uppercase">
            Discount <span className="text-primary">Codes</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Create and manage promotional discount codes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/admin/settings/stripe"
            className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Stripe Settings
          </Link>
          <button
            onClick={openCreateModal}
            className="h-12 px-6 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
            Create Code
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-400"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-green-500">
            check_circle
          </span>
          <p className="text-green-500">{success}</p>
          <button
            onClick={() => setSuccess("")}
            className="ml-auto text-green-500 hover:text-green-400"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Discount Codes Table */}
      <div className="bg-[#1c2230] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-4 block">
              local_offer
            </span>
            <p className="text-slate-400 mb-4">No discount codes yet</p>
            <button
              onClick={openCreateModal}
              className="text-primary hover:text-primary-light font-bold"
            >
              Create your first discount code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Code
                  </th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Type
                  </th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Value
                  </th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Redemptions
                  </th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Expires
                  </th>
                  <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wider px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr
                    key={code._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-white">
                        {code.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400 capitalize">
                        {code.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-bold">
                        {formatValue(code)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">
                        {formatRedemptions(code)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">
                        {formatExpiry(code)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {code.active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-bold rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs font-bold rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(code)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <span className="material-symbols-outlined text-sm">
                            edit
                          </span>
                        </button>
                        {code.active && (
                          <button
                            onClick={() => handleDeactivate(code)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                            title="Deactivate"
                            aria-label="Deactivate"
                          >
                            <span className="material-symbols-outlined text-sm">
                              block
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalMode === "create" ? "Create Discount Code" : "Edit Discount Code"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {modalError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">
                error
              </span>
              <p className="text-red-500 text-sm">{modalError}</p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="code"
              className="text-sm font-bold text-slate-400 uppercase tracking-wider"
            >
              Code
            </label>
            <input
              id="code"
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              disabled={modalMode === "edit"}
              placeholder="SUMMER25"
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white font-mono uppercase focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
            <p className="text-xs text-slate-500">
              Letters and numbers only, auto-uppercased
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="type"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Type
              </label>
              <select
                id="type"
                value={formType}
                onChange={(e) =>
                  setFormType(e.target.value as "percent" | "amount")
                }
                disabled={modalMode === "edit"}
                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="percent">Percentage</option>
                <option value="amount">Fixed Amount</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="value"
                className="text-sm font-bold text-slate-400 uppercase tracking-wider"
              >
                Value ({formType === "percent" ? "%" : "$"})
              </label>
              <input
                id="value"
                type="number"
                step={formType === "percent" ? "1" : "0.01"}
                min="0"
                max={formType === "percent" ? "100" : undefined}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                disabled={modalMode === "edit"}
                placeholder={formType === "percent" ? "25" : "10.00"}
                className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                required={modalMode === "create"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="maxRedemptions"
              className="text-sm font-bold text-slate-400 uppercase tracking-wider"
            >
              Max Redemptions (Optional)
            </label>
            <input
              id="maxRedemptions"
              type="number"
              min="1"
              value={formMaxRedemptions}
              onChange={(e) => setFormMaxRedemptions(e.target.value)}
              placeholder="Leave blank for unlimited"
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="expiresAt"
              className="text-sm font-bold text-slate-400 uppercase tracking-wider"
            >
              Expiry Date (Optional)
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={formExpiresAt}
              onChange={(e) => setFormExpiresAt(e.target.value)}
              className="w-full h-12 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Tournament Restrictions (Optional)
            </label>
            <div className="max-h-40 overflow-y-auto bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
              {tournaments.length === 0 ? (
                <p className="text-slate-500 text-sm">No tournaments available</p>
              ) : (
                tournaments.map((tournament) => (
                  <label
                    key={tournament._id}
                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formTournamentIds.includes(tournament._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormTournamentIds([
                            ...formTournamentIds,
                            tournament._id,
                          ]);
                        } else {
                          setFormTournamentIds(
                            formTournamentIds.filter(
                              (id) => id !== tournament._id
                            )
                          );
                        }
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
                    />
                    <span className="text-white">
                      BOD #{tournament.bodNumber}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {new Date(tournament.date).toLocaleDateString()}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-slate-500">
              Leave unchecked to allow on all tournaments
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={closeModal}
              className="h-12 px-6 text-slate-400 hover:text-white font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalSaving}
              className="h-12 px-6 bg-primary hover:bg-primary-dark text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {modalSaving ? (
                <LoadingSpinner size="sm" color="black" />
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  {modalMode === "create" ? "Create Code" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DiscountCodesPage;
