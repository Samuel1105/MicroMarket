import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full bg-[#eef1f5]">
      <div className="flex flex-col pt-2 px-4 pb-10">{children}</div>
    </div>
  );
}
