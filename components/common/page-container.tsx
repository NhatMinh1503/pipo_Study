import { cn } from "@/lib/utils";

/** Consistent width and spacing for main-app pages. */
export function PageContainer({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10",
        className,
      )}
      {...props}
    />
  );
}
