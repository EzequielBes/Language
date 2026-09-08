import type { ReactNode } from "react";

export function DashboardSection({
  label,
  action,
  className = "mt-10",
  children,
}: {
  label: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`paper-card p-5 sm:p-6 ${className}`}>
      <div className="flex items-baseline justify-between">
        <p className="page-kicker">{label}</p>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
