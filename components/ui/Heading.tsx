
export default function Heading({ children }: { children: React.ReactNode }) {
    return (
        <h1 className="text-2xl mt-10 ml-10 font-bold">
            {children}
        </h1>
    )
}
