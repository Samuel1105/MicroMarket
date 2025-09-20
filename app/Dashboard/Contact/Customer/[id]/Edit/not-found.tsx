import { Button } from "@heroui/react";
import Link from "next/link";

import Heading from "@/components/ui/Heading";

export default function NotFound() {
  return (
    <div className="text-center ">
      <Heading> Cliente no Encontrado</Heading>
      <Link className="mt-5" href="/Dashboard/Contact/Customer/List">
        <Button className="mt-5" color="primary">
          Volver a Clientes
        </Button>
      </Link>
    </div>
  );
}
