import PublicLayout from "@/components/layouts/PublicLayout";

/**
 * Layout for all public (unauthenticated) routes.
 *
 * Route group: (public)
 * Routes:  /, /login, /register, /unauthorized
 */
export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
