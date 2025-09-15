import Heading from "@/components/ui/Heading";
import { Button } from "@heroui/react";
import Link from "next/link";


export default function NotFound() {
    return (
        <div className="text-center ">
            <Heading > Usuario no Encontrado</Heading>
            <Link
                href='/User/List'
                className="mt-5"
            >
                <Button className="mt-5" color="primary">
                    Ir a Usuarios
                </Button>
                
            </Link>
        </div>
    )
}
