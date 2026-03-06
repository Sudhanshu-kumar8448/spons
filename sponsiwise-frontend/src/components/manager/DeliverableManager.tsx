"use client";

import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

// ─── Types (duplicated to avoid server-only import) ────────────────────

type DeliverableCategory = "PHYSICAL" | "DIGITAL";
type BrandingType = "EXCLUSIVE" | "MULTI";
type DeliverableUnit =
  | "POSTS" | "PIECES" | "BOARDS" | "DAYS" | "HOURS"
  | "MINUTES" | "SESSIONS" | "BANNERS" | "PAGES"
  | "SCREENS" | "SPOTS" | "OTHER";
type DeliverableFormStatus = "DRAFT" | "SENT_TO_ORGANIZER" | "FILLED" | "SUBMITTED";

interface DeliverableRow {
  id: string;
  category: DeliverableCategory;
  deliverableName: string;
  brandingType: BrandingType;
  quantity: number;
  unit: DeliverableUnit;
  otherUnit?: string | null;
  remarks?: string | null;
  sortOrder: number;
}

interface DeliverableForm {
  id: string;
  tierId: string;
  status: DeliverableFormStatus;
  rows: DeliverableRow[];
}

interface DeliverableTemplate {
  id: string;
  name: string;
  description?: string | null;
  rows: unknown;
}

interface TierCompareResult {
  tier1: DeliverableForm | null;
  tier2: DeliverableForm | null;
}

// ─── Constants ──────────────────────────────────────────────────────────

const CATEGORIES: { value: DeliverableCategory; label: string }[] = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
];

const BRANDING_TYPES: { value: BrandingType; label: string }[] = [
  { value: "EXCLUSIVE", label: "Exclusive" },
  { value: "MULTI", label: "Multi-Brand" },
];

const UNITS: { value: DeliverableUnit; label: string }[] = [
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

const STATUS_LABELS: Record<DeliverableFormStatus, string> = {
  DRAFT: "Draft",
  SENT_TO_ORGANIZER: "Sent to Organizer",
  FILLED: "Filled by Organizer",
  SUBMITTED: "Submitted",
};

const STATUS_COLORS: Record<DeliverableFormStatus, string> = {
  DRAFT: "bg-slate-500/20 text-slate-300",
  SENT_TO_ORGANIZER: "bg-amber-500/20 text-amber-300",
  FILLED: "bg-blue-500/20 text-blue-300",
  SUBMITTED: "bg-emerald-500/20 text-emerald-300",
};

// ─── Row editor types ───────────────────────────────────────────────────

interface EditableRow {
  id?: string;
  category: DeliverableCategory;
  deliverableName: string;
  brandingType: BrandingType;
  quantity: number;
  unit: DeliverableUnit;
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

// ─── ManageDeliverablesButton ───────────────────────────────────────────

export function ManageDeliverablesButton({
  tierId,
  tierType,
  formStatus,
}: {
  tierId: string;
  tierType: string;
  formStatus?: DeliverableFormStatus | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-500/50 bg-indigo-600/20 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-600/40 hover:border-indigo-400/60"
      >
        📋 {formStatus ? "View Deliverables" : "Manage Deliverables"}
        {formStatus && (
          <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[formStatus]}`}>
            {STATUS_LABELS[formStatus]}
          </span>
        )}
      </button>
      {open && (
        <DeliverableFormModal
          tierId={tierId}
          tierType={tierType}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── DeliverableFormModal ───────────────────────────────────────────────

function DeliverableFormModal({
  tierId,
  tierType,
  onClose,
}: {
  tierId: string;
  tierType: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DeliverableForm | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([emptyRow(0)]);
  const [templates, setTemplates] = useState<DeliverableTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const isDraft = !form || form.status === "DRAFT";
  const isReadOnly = form && form.status !== "DRAFT";

  // Load form + templates
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const existingForm = await apiClient.get<DeliverableForm>(`/manager/tiers/${tierId}/deliverables`).catch(() => null);
        if (existingForm) {
          setForm(existingForm);
          setRows(
            existingForm.rows.map((r) => ({
              id: r.id,
              category: r.category,
              deliverableName: r.deliverableName,
              brandingType: r.brandingType,
              quantity: r.quantity,
              unit: r.unit,
              otherUnit: r.otherUnit ?? "",
              remarks: r.remarks ?? "",
              sortOrder: r.sortOrder,
            })),
          );
        }
        const tpls = await apiClient.get<DeliverableTemplate[]>(`/manager/deliverable-templates`).catch(() => []);
        setTemplates(tpls);
      } catch {
        // No form exists
      } finally {
        setLoading(false);
      }
    })();
  }, [tierId]);

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
    setError(null);
    setSaving(true);
    try {
      const cleanRows = rows
        .filter((r) => r.deliverableName.trim() !== "")
        .map((r, i) => ({
          category: r.category,
          deliverableName: r.deliverableName,
          brandingType: r.brandingType,
          quantity: r.quantity,
          unit: r.unit,
          otherUnit: r.unit === "OTHER" ? r.otherUnit : undefined,
          remarks: r.remarks || undefined,
          sortOrder: i,
        }));

      let result: DeliverableForm;
      if (form) {
        result = await apiClient.put<DeliverableForm>(`/manager/tiers/${tierId}/deliverables`, { rows: cleanRows });
      } else {
        result = await apiClient.post<DeliverableForm>(`/manager/tiers/${tierId}/deliverables`, { rows: cleanRows });
      }
      setForm(result);
      setRows(
        result.rows.map((r) => ({
          id: r.id,
          category: r.category,
          deliverableName: r.deliverableName,
          brandingType: r.brandingType,
          quantity: r.quantity,
          unit: r.unit,
          otherUnit: r.otherUnit ?? "",
          remarks: r.remarks ?? "",
          sortOrder: r.sortOrder,
        })),
      );
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!form) return;
    setSending(true);
    setError(null);
    try {
      const result = await apiClient.post<DeliverableForm>(`/manager/tiers/${tierId}/deliverables/send`);
      setForm(result);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiClient.delete(`/manager/tiers/${tierId}/deliverables`);
      setForm(null);
      setRows([emptyRow(0)]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = async (tpl: DeliverableTemplate) => {
    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.post<DeliverableForm>(`/manager/tiers/${tierId}/deliverables/apply-template/${tpl.id}`);
      setForm(result);
      setRows(
        result.rows.map((r) => ({
          id: r.id,
          category: r.category,
          deliverableName: r.deliverableName,
          brandingType: r.brandingType,
          quantity: r.quantity,
          unit: r.unit,
          otherUnit: r.otherUnit ?? "",
          remarks: r.remarks ?? "",
          sortOrder: r.sortOrder,
        })),
      );
      setShowTemplates(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to apply template");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setError(null);
    try {
      const cleanRows = rows
        .filter((r) => r.deliverableName.trim() !== "")
        .map((r, i) => ({
          category: r.category,
          deliverableName: r.deliverableName,
          brandingType: r.brandingType,
          quantity: r.quantity,
          unit: r.unit,
          otherUnit: r.unit === "OTHER" ? r.otherUnit : undefined,
          remarks: r.remarks || undefined,
          sortOrder: i,
        }));
      const tpl = await apiClient.post<DeliverableTemplate>(`/manager/deliverable-templates`, {
        name: templateName.trim(),
        rows: cleanRows as any,
      });
      setTemplates((prev) => [...prev, tpl]);
      setTemplateName("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save template");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Deliverables — {tierType}
            </h2>
            {form && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[form.status]}`}>
                {STATUS_LABELS[form.status]}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">Loading…</div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Template bar (draft only) */}
              {isDraft && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    📑 Templates ({templates.length})
                  </button>
                  {rows.some((r) => r.deliverableName.trim()) && (
                    <div className="flex items-center gap-1">
                      <input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveAsTemplate}
                        disabled={!templateName.trim()}
                        className="rounded-lg bg-indigo-600/30 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-600/50 disabled:opacity-40"
                      >
                        Save as Template
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Templates dropdown */}
              {showTemplates && templates.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-2">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-700">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{tpl.name}</p>
                        {tpl.description && <p className="text-xs text-slate-400">{tpl.description}</p>}
                        <p className="text-xs text-slate-500">{(tpl.rows as any[]).length} rows</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleApplyTemplate(tpl)}
                          className="rounded bg-indigo-600/30 px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-600/50"
                        >
                          Apply
                        </button>
                        <button
                          onClick={async () => {
                            await apiClient.delete(`/manager/deliverable-templates/${tpl.id}`).catch(() => {});
                            setTemplates((p) => p.filter((t) => t.id !== tpl.id));
                          }}
                          className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-300 hover:bg-red-600/40"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Rows table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                      <th className="px-2 py-2 w-8">#</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Deliverable</th>
                      <th className="px-2 py-2">Branding</th>
                      <th className="px-2 py-2 w-20">Qty</th>
                      <th className="px-2 py-2">Unit</th>
                      <th className="px-2 py-2">Remarks</th>
                      {isDraft && <th className="px-2 py-2 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-800">
                        <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-200">{row.category}</span>
                          ) : (
                            <select
                              value={row.category}
                              onChange={(e) => updateRow(idx, "category", e.target.value)}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-200">{row.deliverableName}</span>
                          ) : (
                            <input
                              value={row.deliverableName}
                              onChange={(e) => updateRow(idx, "deliverableName", e.target.value)}
                              placeholder="e.g. Banner at main stage"
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-200">{row.brandingType}</span>
                          ) : (
                            <select
                              value={row.brandingType}
                              onChange={(e) => updateRow(idx, "brandingType", e.target.value)}
                              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            >
                              {BRANDING_TYPES.map((b) => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-200">{row.quantity}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={(e) => updateRow(idx, "quantity", Number(e.target.value))}
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-200">
                              {row.unit === "OTHER" ? row.otherUnit || "Other" : UNITS.find((u) => u.value === row.unit)?.label}
                            </span>
                          ) : (
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
                                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
                                />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {isReadOnly ? (
                            <span className="text-slate-400 text-xs">{row.remarks || "—"}</span>
                          ) : (
                            <input
                              value={row.remarks}
                              onChange={(e) => updateRow(idx, "remarks", e.target.value)}
                              placeholder="Optional"
                              className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
                            />
                          )}
                        </td>
                        {isDraft && (
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeRow(idx)}
                              className="text-red-400 hover:text-red-300"
                              title="Remove row"
                            >
                              ✕
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row button */}
              {isDraft && (
                <button
                  onClick={addRow}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  + Add Row
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
            <div>
              {isDraft && form && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-600/40 disabled:opacity-40"
                >
                  Delete Form
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              {isDraft && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving || rows.every((r) => !r.deliverableName.trim())}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                  >
                    {saving ? "Saving…" : form ? "Update" : "Save"}
                  </button>
                  {form && form.rows.length > 0 && (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {sending ? "Sending…" : "Send to Organizer"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TierCompareModal ───────────────────────────────────────────────────

export function TierCompareButton({
  eventId,
  tiers,
}: {
  eventId: string;
  tiers: Array<{ id: string; tier_type: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [tier1, setTier1] = useState(tiers[0]?.id ?? "");
  const [tier2, setTier2] = useState(tiers[1]?.id ?? "");
  const [result, setResult] = useState<TierCompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!tier1 || !tier2 || tier1 === tier2) return;
    setLoading(true);
    try {
      const r = await apiClient.get<TierCompareResult>(`/manager/events/${eventId}/deliverables/compare?tier1=${tier1}&tier2=${tier2}`);
      setResult(r);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  if (tiers.length < 2) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/30 px-3 py-1.5 text-xs font-medium text-purple-200 transition hover:bg-purple-600/50"
      >
        ⚖️ Compare Tiers
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Compare Tier Deliverables</h2>
              <button onClick={() => { setOpen(false); setResult(null); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <select value={tier1} onChange={(e) => setTier1(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.tier_type}</option>
                  ))}
                </select>
                <span className="text-slate-400">vs</span>
                <select value={tier2} onChange={(e) => setTier2(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.tier_type}</option>
                  ))}
                </select>
                <button
                  onClick={handleCompare}
                  disabled={loading || tier1 === tier2}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40"
                >
                  {loading ? "Loading…" : "Compare"}
                </button>
              </div>

              {result && (
                <div className="grid grid-cols-2 gap-4">
                  {[result.tier1, result.tier2].map((side, sideIdx) => (
                    <div key={sideIdx} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-200">
                        {tiers.find((t) => t.id === (sideIdx === 0 ? tier1 : tier2))?.tier_type ?? "Tier"}
                      </h3>
                      {side ? (
                        <>
                          <span className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[side.status]}`}>
                            {STATUS_LABELS[side.status]}
                          </span>
                          <table className="mt-2 w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-600 text-slate-400">
                                <th className="px-1 py-1">Category</th>
                                <th className="px-1 py-1">Deliverable</th>
                                <th className="px-1 py-1">Branding</th>
                                <th className="px-1 py-1">Qty</th>
                                <th className="px-1 py-1">Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {side.rows.map((r, i) => (
                                <tr key={i} className="border-b border-slate-700">
                                  <td className="px-1 py-1 text-slate-300">{r.category}</td>
                                  <td className="px-1 py-1 text-slate-200">{r.deliverableName}</td>
                                  <td className="px-1 py-1 text-slate-300">{r.brandingType}</td>
                                  <td className="px-1 py-1 text-slate-200">{r.quantity}</td>
                                  <td className="px-1 py-1 text-slate-300">
                                    {r.unit === "OTHER" ? r.otherUnit : r.unit}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No deliverables form yet</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
