import { AppNav } from "@/components/app/AppNav";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 print:hidden">
        <AppNav />
      </div>
      {children}
    </>
  );
}
