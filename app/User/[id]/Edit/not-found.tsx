import { Button } from "@heroui/react";
import Link from "next/link";

import Heading from "@/components/ui/Heading";

export default function NotFound() {
  return (
    <div className="text-center ">
      <Heading> Usuario no Encontrado</Heading>
      <Link className="mt-5" href="/User/List">
        <Button className="mt-5" color="primary">
          Ir a Usuarios
        </Button>
      </Link>
    </div>
  );
}
