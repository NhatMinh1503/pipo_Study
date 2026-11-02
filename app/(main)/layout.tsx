import { requireUser } from "@/server/auth";

// Everything under (main) needs a signed-in user. The proxy redirects optimistically;
// this check is the authoritative one on the server.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return <div className="flex flex-1 flex-col">{children}</div>;
}
