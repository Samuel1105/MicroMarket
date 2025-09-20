import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 w-full h-screen overflow-y-auto">
      <div className="flex flex-col pt-2 px-4">{children}</div>
    </main>
  );
}
