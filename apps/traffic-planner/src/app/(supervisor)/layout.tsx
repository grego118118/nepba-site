import { TopBar } from "@/components/top-bar";
import { requireSupervisor } from "@/lib/session-helpers";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSupervisor();
  return (
    <div className="min-h-screen">
      <TopBar userName={user.name} />
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
