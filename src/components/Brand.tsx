import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src={logoMark}
      alt="Gestor de Obras"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}

export function BrandLockup({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={36} className="drop-shadow-sm" />
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight text-sidebar-foreground">Gestor de Obras</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/55">canteiro inteligente</div>
        </div>
      )}
    </div>
  );
}
