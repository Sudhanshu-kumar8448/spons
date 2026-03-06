"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface SponsorTierDeliverables {
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
}

const UNIT_LABELS: Record<string, string> = {
  POSTS: "Posts",
  PIECES: "Pieces",
  BOARDS: "Boards",
  DAYS: "Days",
  HOURS: "Hours",
  MINUTES: "Minutes",
  SESSIONS: "Sessions",
  BANNERS: "Banners",
  PAGES: "Pages",
  SCREENS: "Screens",
  SPOTS: "Spots",
};

export function ViewDeliverablesButton({
  tierId,
  tierName,
  eventId,
  hasDeliverables,
}: {
  tierId: string;
  tierName: string;
  eventId: string;
  hasDeliverables: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SponsorTierDeliverables | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasDeliverables) return null;

  const handleOpen = async () => {
    setOpen(true);
    if (data) return; // already loaded
    setLoading(true);
    try {
      const result = await apiClient.get<SponsorTierDeliverables>(`/sponsor/tiers/${tierId}/deliverables`);
      setData(result);
    } catch {
      setError("Deliverables not available");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/30"
      >
        📋 View Deliverables
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white">
                Deliverables — {tierName}
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="py-12 text-center text-slate-400">Loading…</div>
              ) : error ? (
                <div className="py-12 text-center text-red-400">{error}</div>
              ) : data ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Deliverable</th>
                          <th className="px-3 py-2">Branding</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row, idx) => (
                          <tr key={row.id} className="border-b border-slate-800">
                            <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.category === "PHYSICAL"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-cyan-500/20 text-cyan-300"
                              }`}>
                                {row.category}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-200 font-medium">{row.deliverableName}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.brandingType === "EXCLUSIVE"
                                  ? "bg-purple-500/20 text-purple-300"
                                  : "bg-slate-500/20 text-slate-300"
                              }`}>
                                {row.brandingType === "EXCLUSIVE" ? "Exclusive" : "Multi-Brand"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-200 font-bold">{row.quantity}</td>
                            <td className="px-3 py-2 text-slate-300">
                              {row.unit === "OTHER" ? row.otherUnit || "Other" : UNIT_LABELS[row.unit] ?? row.unit}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-400">{row.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* CTA to submit proposal for this tier */}
                  <div className="mt-6 flex justify-end">
                    <a
                      href={`/brand/proposals/new?event_id=${eventId}&tier_id=${tierId}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      Submit Proposal for this Tier →
                    </a>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
