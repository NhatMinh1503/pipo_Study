import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<React.ComponentProps<typeof Button>, "type"> {
  isPending: boolean;
}

/** Full-width submit button that shows a spinner and blocks double submits while pending. */
export function SubmitButton({
  isPending,
  disabled,
  children,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isPending || disabled}
      aria-busy={isPending}
      className={className ?? "w-full"}
      {...props}
    >
      {isPending && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
