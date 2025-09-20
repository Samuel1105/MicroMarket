export default function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl mt-10 ml-10 font-bold max-sm:text-center">
      {children}
    </h1>
  );
}
