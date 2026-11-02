import Link from "next/link";

interface AuthFooterLinkProps {
  prompt: string;
  href: string;
  label: string;
}

/** "No account yet? Sign up" style line under an auth card. */
export function AuthFooterLink({ prompt, href, label }: AuthFooterLinkProps) {
  return (
    <p>
      {prompt}{" "}
      <Link
        href={href}
        className="font-mono text-[0.75rem] font-semibold tracking-[0.04em] text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid"
      >
        {label}
      </Link>
    </p>
  );
}
