import Heading from "@/components/ui/Heading";
import { Button } from "@heroui/react";
import Link from "next/link";


export default function NotFound() {
    return (
        <div className="text-center ">
            <Heading > Proucto no encontrado </Heading>
            <Link
                href='/Dashboard/Product/List'
                className="mt-5"
            >
                <Button className="mt-5" color="primary">
                    Volver a productos
                </Button>
                
            </Link>
        </div>
    )
}
