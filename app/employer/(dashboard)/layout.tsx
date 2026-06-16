import { EmployerSidebar } from "@/components/employer/EmployerSidebar";

export default function EmployerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <EmployerSidebar />
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}
