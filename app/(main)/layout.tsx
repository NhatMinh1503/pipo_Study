import { requireOnboardedProfile } from "@/server/profile";

// Everything under (main) needs a signed-in, onboarded user. The proxy redirects
// optimistically; this check is the authoritative one on the server.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await requireOnboardedProfile();

  return <div className="flex flex-1 flex-col">{children}</div>;
}
