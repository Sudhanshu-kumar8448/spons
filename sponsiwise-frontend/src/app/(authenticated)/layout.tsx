import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import RoleLayoutRenderer from "@/components/layouts/RoleLayoutRenderer";

/**
 * Layout for all authenticated routes.
 *
 * Route group: (authenticated)
 * Routes:  /dashboard/*, /admin/*
 *
 * How it works:
 *   1. Calls `getServerUser()` which forwards cookies to GET /auth/me.
 *   2. If not authenticated → redirect to /login.
 *   3. Otherwise passes the user object to `RoleLayoutRenderer` which
 *      picks the correct layout based on the user's role.
 *
 * Everything runs server-side — zero client-side role checks.
 */
export default async function AuthenticatedGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
    return null; // Should be unreachable
  }

  return <RoleLayoutRenderer user={user}>{children}</RoleLayoutRenderer>;
}




// ye file jo hai wo server [it calls getServerUser()  ] se puchhata hai kon login hai agar koi hai then uska role kya hai and usko us page pe bhej do 
