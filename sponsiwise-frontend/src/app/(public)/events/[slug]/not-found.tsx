import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl">📅</span>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        Event not found
      </h2>
      <p className="mt-1 text-2xl text-red-500">
        The event you&apos;re looking for doesn&apos;t exist or is no longer
        published.
      </p>
      <Link
        href="/events"
        className="mt-6 rounded-md bg-blue-400 px-4 py-2 mt-8 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Browse events
      </Link>
    </div>
  );
}
