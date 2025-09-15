import Heading from "@/components/ui/Heading";
import { Button } from "@heroui/react";
import Link from "next/link";


export default function NotFound() {
    return (
        <div className="text-center ">
            <Heading > Cliente no Encontrado</Heading>
            <Link
                href='/Dashboard/Contact/Customer/List'
                className="mt-5"
            >
                <Button className="mt-5" color="primary">
                    Volver a Clientes
                </Button>
                
            </Link>
        </div>
    )
}
