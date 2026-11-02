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
      <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}
