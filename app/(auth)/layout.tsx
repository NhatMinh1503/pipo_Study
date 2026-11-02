import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 px-4 py-12">
      <Link
        href="/"
        className="self-center font-heading text-2xl leading-none font-bold tracking-[0.22em] uppercase"
      >
        pipo
      </Link>
      {children}
    </main>
  );
}
