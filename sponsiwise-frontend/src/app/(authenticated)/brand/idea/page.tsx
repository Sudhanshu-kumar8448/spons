import { Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BrandIdeaPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Sponsorship Ideas</h1>
        <p className="mt-1 text-sm text-slate-400">
          Strategic sponsorship opportunities and insights.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
          <Lightbulb className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="mt-6 text-lg font-semibold text-white">
          Coming Soon
        </h2>
        <p className="mt-2 max-w-md text-center text-sm text-slate-400">
          We&apos;re building intelligent sponsorship recommendations based on your brand profile,
          past sponsorships, and market trends. Stay tuned!
        </p>
        <Link
          href="/brand/browseEvents"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          Browse events instead
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
