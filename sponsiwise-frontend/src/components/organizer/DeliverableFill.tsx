"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { formatInr } from "@/lib/currency";

interface OrganizerDeliverableForm {
  id: string;
  tierId: string;
  status: string;
  rows: Array<{
    id: string;
    category: string;
    deliverableName: string;
    brandingType: string;
    quantity: number;
    unit: string;
    otherUnit?: string | null;
    remarks?: string | null;
    sortOrder: number;
  }>;
  tier?: {
    id: string;
    tierType: string;
    askingPrice: number;
    customName?: string | null;
    event: {
      id: string;
      title: string;
    };
  };
}

// ─── Constants ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
];

const BRANDING_TYPES = [
  { value: "EXCLUSIVE", label: "Exclusive" },
  { value: "MULTI", label: "Multi-Brand" },
];

const UNITS = [
  { value: "POSTS", label: "Posts" },
  { value: "PIECES", label: "Pieces" },
  { value: "BOARDS", label: "Boards" },
  { value: "DAYS", label: "Days" },
  { value: "HOURS", label: "Hours" },
  { value: "MINUTES", label: "Minutes" },
  { value: "SESSIONS", label: "Sessions" },
  { value: "BANNERS", label: "Banners" },
  { value: "PAGES", label: "Pages" },
  { value: "SCREENS", label: "Screens" },
  { value: "SPOTS", label: "Spots" },
  { value: "OTHER", label: "Other" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT_TO_ORGANIZER: "Pending Your Input",
  FILLED: "Filled — Awaiting Submission",
  SUBMITTED: "Submitted",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/10 border border-slate-500/20 text-slate-400",
  SENT_TO_ORGANIZER: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
  FILLED: "bg-blue-500/10 border border-blue-500/20 text-blue-400",
  SUBMITTED: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
};

const TIER_DISPLAY: Record<string, string> = {
  TITLE: "Title Sponsor",
  PLATINUM: "Platinum Sponsor",
  PRESENTING: "Presenting Sponsor",
  POWERED_BY: "Powered By",
  GOLD: "Gold Tier",
  SILVER: "Silver Tier",
  CUSTOM: "Custom Tier",
};

// ─── Row type ───────────────────────────────────────────────────────────

interface EditableRow {
  id?: string;
  category: string;
  deliverableName: string;
  brandingType: string;
  quantity: number;
  unit: string;
  otherUnit: string;
  remarks: string;
  sortOrder: number;
}

function emptyRow(sortOrder: number): EditableRow {
  return {
    category: "PHYSICAL",
    deliverableName: "",
    brandingType: "EXCLUSIVE",
    quantity: 1,
    unit: "PIECES",
    otherUnit: "",
    remarks: "",
    sortOrder,
  };
}

function formToRows(form: OrganizerDeliverableForm): EditableRow[] {
  return form.rows.map((r) => ({
    id: r.id,
    category: r.category,
    deliverableName: r.deliverableName,
    brandingType: r.brandingType,
    quantity: r.quantity,
    unit: r.unit,
    otherUnit: r.otherUnit ?? "",
    remarks: r.remarks ?? "",
    sortOrder: r.sortOrder,
  }));
}

// ─── FillDeliverablesButton (kept for backward compat) ─────────────────

export function FillDeliverablesButton({
  eventId,
  tierName,
  formStatus,
}: {
  eventId: string;
  tierName: string;
  formStatus?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<OrganizerDeliverableForm[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show for actionable statuses
  if (!formStatus || formStatus === "DRAFT") return null;

  const canFill = formStatus === "SENT_TO_ORGANIZER" || formStatus === "FILLED";

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const all = await apiClient.get<OrganizerDeliverableForm[]>(`/organizer/events/${eventId}/deliverables`);
      setForms(all);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${canFill
            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
      >
        📋 {canFill ? "Fill Deliverables" : "View Deliverables"}
        <span className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[formStatus] ?? ""}`}>
          {STATUS_LABELS[formStatus] ?? formStatus}
        </span>
      </button>
      {open && (
        <DeliverableFillModal
          forms={forms}
          loading={loading}
          tierName={tierName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── DeliverableFillSection (inline, all-tiers view) ────────────────────

/**
 * Full inline section that shows ALL deliverable forms for an event.
 * Used on the organizer event detail page.
 * - Shows all tiers vertically
 * - Editable when SENT_TO_ORGANIZER or FILLED
 * - Read-only when SUBMITTED
 * - Single submit-all action
 */
export function DeliverableFillSection({ eventId }: { eventId: string }) {
  const [forms, setForms] = useState<OrganizerDeliverableForm[]>([]);
  const [formRows, setFormRows] = useState<Record<string, EditableRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadForms();
  }, [eventId]);

  const loadForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await apiClient.get<OrganizerDeliverableForm[]>(`/organizer/events/${eventId}/deliverables`);
      setForms(all);
      const rowMap: Record<string, EditableRow[]> = {};
      for (const f of all) {
        // Load full form data with rows
        try {
          const full = await apiClient.get<OrganizerDeliverableForm>(`/organizer/deliverables/${f.id}`);
          rowMap[f.id] = formToRows(full);
          // update form with full data
          const idx = all.findIndex(x => x.id === f.id);
          if (idx >= 0) all[idx] = full;
        } catch {
          rowMap[f.id] = formToRows(f);
        }
      }
      setForms([...all]);
      setFormRows(rowMap);
    } catch {
      setError("Failed to load deliverable forms");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = useCallback((formId: string, idx: number, field: keyof EditableRow, value: any) => {
    setFormRows((prev) => ({
      ...prev,
      [formId]: prev[formId].map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  }, []);

  const addRow = useCallback((formId: string) => {
    setFormRows((prev) => ({
      ...prev,
      [formId]: [...(prev[formId] ?? []), emptyRow((prev[formId] ?? []).length)],
    }));
  }, []);

  const removeRow = useCallback((formId: string, idx: number) => {
    setFormRows((prev) => ({
      ...prev,
      [formId]: prev[formId].filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i })),
    }));
  }, []);

  const handleSaveAll = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const editableForms = forms.filter(f => f.status === "SENT_TO_ORGANIZER" || f.status === "FILLED");
      for (const f of editableForms) {
        const rows = formRows[f.id] ?? [];
        const cleanRows = rows
          .filter((r) => r.deliverableName.trim())
          .map((r, i) => ({
            id: r.id,
            category: r.category,
            deliverableName: r.deliverableName,
            brandingType: r.brandingType,
            quantity: r.quantity,
            unit: r.unit,
            otherUnit: r.unit === "OTHER" ? r.otherUnit : undefined,
            remarks: r.remarks || undefined,
            sortOrder: i,
          }));
        const result = await apiClient.put<OrganizerDeliverableForm>(`/organizer/deliverables/${f.id}`, { rows: cleanRows });
        setForms(prev => prev.map(pf => pf.id === f.id ? result : pf));
        setFormRows(prev => ({ ...prev, [f.id]: formToRows(result) }));
      }
      setSuccessMsg("All forms saved successfully!");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      // First save, then submit each filled form
      const editableForms = forms.filter(f => f.status === "SENT_TO_ORGANIZER" || f.status === "FILLED");

      // Save all editable forms first
      for (const f of editableForms) {
        const rows = formRows[f.id] ?? [];
        const cleanRows = rows
          .filter((r) => r.deliverableName.trim())
          .map((r, i) => ({
            id: r.id,
            category: r.category,
            deliverableName: r.deliverableName,
            brandingType: r.brandingType,
            quantity: r.quantity,
            unit: r.unit,
            otherUnit: r.unit === "OTHER" ? r.otherUnit : undefined,
            remarks: r.remarks || undefined,
            sortOrder: i,
          }));
        await apiClient.put<OrganizerDeliverableForm>(`/organizer/deliverables/${f.id}`, { rows: cleanRows });
      }

      // Now submit each form
      for (const f of editableForms) {
        const result = await apiClient.post<OrganizerDeliverableForm>(`/organizer/deliverables/${f.id}/submit`);
        setForms(prev => prev.map(pf => pf.id === f.id ? result : pf));
      }
      setSuccessMsg("All deliverable forms submitted to manager!");
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8">
        <div className="flex items-center justify-center py-8 text-slate-500">Loading deliverable forms…</div>
      </div>
    );
  }

  if (forms.length === 0) return null;

  const hasEditableForms = forms.some(f => f.status === "SENT_TO_ORGANIZER" || f.status === "FILLED");
  const allSubmitted = forms.every(f => f.status === "SUBMITTED");

  return (
    <div id="deliverables" className="rounded-xl border border-slate-800 bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Deliverable Forms</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {allSubmitted
              ? "All forms have been submitted. These are read-only."
              : "Fill in the deliverables for each sponsorship tier and submit."}
          </p>
        </div>
        {allSubmitted && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            ✅ All Submitted
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-800/60">
        {forms.map((form) => {
          const rows = formRows[form.id] ?? [];
          const isEditable = form.status === "SENT_TO_ORGANIZER" || form.status === "FILLED";
          const tierLabel = form.tier?.customName || TIER_DISPLAY[form.tier?.tierType ?? ""] || form.tier?.tierType || "Tier";

          return (
            <div key={form.id} className="px-6 py-5">
              {/* Tier Header */}
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">{tierLabel}</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[form.status] ?? ""}`}>
                  {STATUS_LABELS[form.status] ?? form.status}
                </span>
                {form.tier?.askingPrice != null && (
                  <span className="text-xs text-slate-500">
                    {formatInr(Number(form.tier.askingPrice))}
                  </span>
                )}
              </div>

              {/* Rows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                      <th className="px-2 py-2 w-8">#</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Deliverable</th>
                      <th className="px-2 py-2">Branding</th>
                      <th className="px-2 py-2 w-20">Qty</th>
                      <th className="px-2 py-2">Unit</th>
                      <th className="px-2 py-2">Remarks</th>
                      {isEditable && <th className="px-2 py-2 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={isEditable ? 8 : 7} className="px-2 py-4 text-center text-xs text-slate-500">
                          No deliverables yet.{isEditable && ' Click "+Add Row" below to start.'}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <select
                                value={row.category}
                                onChange={(e) => updateRow(form.id, idx, "category", e.target.value)}
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                              >
                                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            ) : (
                              <span className="text-slate-300">{CATEGORIES.find(c => c.value === row.category)?.label ?? row.category}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <input
                                value={row.deliverableName}
                                onChange={(e) => updateRow(form.id, idx, "deliverableName", e.target.value)}
                                placeholder="e.g. Main stage banner"
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                              />
                            ) : (
                              <span className="text-slate-300">{row.deliverableName}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <select
                                value={row.brandingType}
                                onChange={(e) => updateRow(form.id, idx, "brandingType", e.target.value)}
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                              >
                                {BRANDING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                              </select>
                            ) : (
                              <span className="text-slate-300">{BRANDING_TYPES.find(b => b.value === row.brandingType)?.label ?? row.brandingType}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <input
                                type="number"
                                min={0}
                                value={row.quantity}
                                onChange={(e) => updateRow(form.id, idx, "quantity", Number(e.target.value))}
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                              />
                            ) : (
                              <span className="text-slate-300">{row.quantity}</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <div className="flex flex-col gap-1">
                                <select
                                  value={row.unit}
                                  onChange={(e) => updateRow(form.id, idx, "unit", e.target.value)}
                                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                                >
                                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                                </select>
                                {row.unit === "OTHER" && (
                                  <input
                                    value={row.otherUnit}
                                    onChange={(e) => updateRow(form.id, idx, "otherUnit", e.target.value)}
                                    placeholder="Custom unit"
                                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                                  />
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">
                                {row.unit === "OTHER" ? row.otherUnit || "Other" : UNITS.find(u => u.value === row.unit)?.label ?? row.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {isEditable ? (
                              <input
                                value={row.remarks}
                                onChange={(e) => updateRow(form.id, idx, "remarks", e.target.value)}
                                placeholder="Optional"
                                className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                              />
                            ) : (
                              <span className="text-xs text-slate-500">{row.remarks || "—"}</span>
                            )}
                          </td>
                          {isEditable && (
                            <td className="px-2 py-2">
                              <button onClick={() => removeRow(form.id, idx)} className="text-red-400 hover:text-red-300" title="Remove">✕</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {isEditable && (
                <button
                  onClick={() => addRow(form.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  + Add Row
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mx-6 mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Footer Actions */}
      {hasEditableForms && (
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-5 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save All Changes"}
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-40 transition-all"
          >
            {submitting ? "Submitting…" : "Submit All to Manager"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DeliverableFillModal (legacy, used by FillDeliverablesButton) ──────

function DeliverableFillModal({
  forms,
  loading: initialLoading,
  tierName,
  onClose,
}: {
  forms: OrganizerDeliverableForm[];
  loading: boolean;
  tierName: string;
  onClose: () => void;
}) {
  const [selectedForm, setSelectedForm] = useState<OrganizerDeliverableForm | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialLoading);

  // Auto-select first form
  useEffect(() => {
    if (forms.length > 0 && !selectedForm) {
      loadForm(forms[0]);
    }
  }, [forms]);

  const loadForm = async (form: OrganizerDeliverableForm) => {
    setLoading(true);
    try {
      const full = await apiClient.get<OrganizerDeliverableForm>(`/organizer/deliverables/${form.id}`);
      setSelectedForm(full);
      setRows(formToRows(full));
    } catch {
      setError("Could not load form");
    } finally {
      setLoading(false);
    }
  };

  const isEditable = selectedForm?.status === "SENT_TO_ORGANIZER" || selectedForm?.status === "FILLED";

  const updateRow = useCallback((idx: number, field: keyof EditableRow, value: any) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow(prev.length)]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i })));
  }, []);

  const handleSave = async () => {
    if (!selectedForm) return;
    setError(null);
    setSaving(true);
    try {
      const cleanRows = rows
        .filter((r) => r.deliverableName.trim())
        .map((r, i) => ({
          id: r.id,
          category: r.category,
          deliverableName: r.deliverableName,
          brandingType: r.brandingType,
          quantity: r.quantity,
          unit: r.unit,
          otherUnit: r.unit === "OTHER" ? r.otherUnit : undefined,
          remarks: r.remarks || undefined,
          sortOrder: i,
        }));
      const result = await apiClient.put<OrganizerDeliverableForm>(`/organizer/deliverables/${selectedForm.id}`, { rows: cleanRows });
      setSelectedForm(result);
      setRows(formToRows(result));
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedForm) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.post<OrganizerDeliverableForm>(`/organizer/deliverables/${selectedForm.id}/submit`);
      setSelectedForm(result);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Deliverables — {tierName}
            </h2>
            {selectedForm && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[selectedForm.status] ?? ""}`}>
                {STATUS_LABELS[selectedForm.status] ?? selectedForm.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">Loading…</div>
          ) : !selectedForm ? (
            <div className="py-12 text-center text-slate-500">No deliverable forms found for this event.</div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Multi-form selector (if event has multiple tiers with forms) */}
              {forms.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {forms.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => loadForm(f)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedForm.id === f.id
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-300"
                        }`}
                    >
                      {f.tier?.tierType ?? "Tier"} {f.tier?.customName ? `(${f.tier.customName})` : ""}
                    </button>
                  ))}
                </div>
              )}

              {/* Rows table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs uppercase text-slate-500">
                      <th className="px-2 py-2 w-8">#</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Deliverable</th>
                      <th className="px-2 py-2">Branding</th>
                      <th className="px-2 py-2 w-20">Qty</th>
                      <th className="px-2 py-2">Unit</th>
                      <th className="px-2 py-2">Remarks</th>
                      {isEditable && <th className="px-2 py-2 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50">
                        <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <select
                              value={row.category}
                              onChange={(e) => updateRow(idx, "category", e.target.value)}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300">{row.category}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <input
                              value={row.deliverableName}
                              onChange={(e) => updateRow(idx, "deliverableName", e.target.value)}
                              placeholder="e.g. Main stage banner"
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                          ) : (
                            <span className="text-slate-300">{row.deliverableName}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <select
                              value={row.brandingType}
                              onChange={(e) => updateRow(idx, "brandingType", e.target.value)}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            >
                              {BRANDING_TYPES.map((b) => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300">{row.brandingType}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <input
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            />
                          ) : (
                            <span className="text-slate-300">{row.quantity}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={row.unit}
                                onChange={(e) => updateRow(idx, "unit", e.target.value)}
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                              >
                                {UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                              {row.unit === "OTHER" && (
                                <input
                                  value={row.otherUnit}
                                  onChange={(e) => updateRow(idx, "otherUnit", e.target.value)}
                                  placeholder="Custom unit"
                                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">{row.unit === "OTHER" ? row.otherUnit || "Other" : UNITS.find(u => u.value === row.unit)?.label ?? row.unit}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isEditable ? (
                            <input
                              value={row.remarks}
                              onChange={(e) => updateRow(idx, "remarks", e.target.value)}
                              placeholder="Optional"
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{row.remarks || "—"}</span>
                          )}
                        </td>
                        {isEditable && (
                          <td className="px-2 py-2">
                            <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-300" title="Remove">✕</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isEditable && (
                <button
                  onClick={addRow}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  + Add Row
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && selectedForm && (
          <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900 px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              Close
            </button>
            {isEditable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || rows.every((r) => !r.deliverableName.trim())}
                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rows.every((r) => !r.deliverableName.trim())}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-40 transition-all"
                >
                  {submitting ? "Submitting…" : "Submit to Manager"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
