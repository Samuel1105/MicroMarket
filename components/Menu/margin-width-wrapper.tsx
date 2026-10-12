import { ReactNode } from "react";

export default function MarginWidthWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-col lg:ml-64 min-h-screen">{children}</div>;
}
