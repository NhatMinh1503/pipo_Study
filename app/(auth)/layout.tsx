import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="self-center text-2xl font-semibold tracking-tight">
        pipo
      </Link>
      {children}
    </main>
  );
}
