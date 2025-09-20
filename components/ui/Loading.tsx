import { CircularProgress } from "@heroui/react";

export default function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <h1 className="text-3xl font-bold max-sm:text-center">
        <CircularProgress label={children} />
      </h1>
    </div>
  );
}
