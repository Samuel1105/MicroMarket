import Heading from "@/components/ui/Heading";
import { Button } from "@heroui/react";
import Link from "next/link";


export default function NotFound() {
    return (
        <div className="text-center ">
            <Heading > Proveedor no Encontrado</Heading>
            <Link
                href='/Dashboard/Contact/Suppier/List'
                className="mt-5"
            >
                <Button className="mt-5" color="primary">
                    Volver a Proveedores
                </Button>
                
            </Link>
        </div>
    )
}
