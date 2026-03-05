import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchBrowsableEventById } from "@/lib/sponsor-api";
import ProposalForm from "./ProposalForm";
import type { SponsorshipTier } from "@/lib/types/sponsor";

interface NewProposalPageProps {
  searchParams: Promise<{ event_id?: string }>;
}

export default async function NewProposalPage({
  searchParams,
}: NewProposalPageProps) {
  const params = await searchParams;
  const eventId = params.event_id;

  if (!eventId) {
    redirect("/brand/browseEvents");
  }

  let eventTitle = "Unknown event";
  let availableTiers: SponsorshipTier[] = [];
  try {
    const event = await fetchBrowsableEventById(eventId);
    eventTitle = event.title;
    availableTiers = event.tiers.filter(t => t.availableSlots > 0);
  } catch {
    // Event not found — show form anyway with generic title
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/brand/browseEvents/${eventId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
      >
        ← Back to event
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">New Proposal</h1>
        <p className="mt-1 text-sm text-slate-400">
          Submit a sponsorship proposal for this event.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <ProposalForm
          eventId={eventId}
          eventTitle={eventTitle}
          availableTiers={availableTiers}
        />
      </div>
    </div>
  );
}
