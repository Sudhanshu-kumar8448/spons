import Link from "next/link";

export default function CompanyNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl">🏢</span>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        Company not found
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        The company profile you&apos;re looking for doesn&apos;t exist or is not
        publicly available.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
