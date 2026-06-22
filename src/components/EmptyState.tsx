import type { ReactNode } from "react";
import emptyNotas from "@/assets/empty-notas.png";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  illustration?: "notas" | "none";
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, illustration = "notas", action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center", className)}>
      {illustration === "notas" && (
        <img
          src={emptyNotas}
          alt=""
          width={260}
          height={195}
          loading="lazy"
          className="mb-6 h-40 w-auto opacity-95"
        />
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
