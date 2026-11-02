import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared frame for every auth screen: title, description, form, footer links. */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Card className="w-full gap-6">
      <CardHeader className="border-b border-dashed border-border/40 pb-4">
        <CardTitle className="text-[1.375rem] tracking-[0.02em] uppercase">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>
      )}
    </Card>
  );
}
