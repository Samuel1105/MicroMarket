import { Button } from "@heroui/react";
import Link from "next/link";

import Heading from "@/components/ui/Heading";

export default function NotFound() {
  return (
    <div className="text-center ">
      <Heading> Unidad de medidad no Encontrado</Heading>
      <Link className="mt-5" href="/Dashboard/Config/Unit/List">
        <Button className="mt-5" color="primary">
          Volver a Unidades de Medida
        </Button>
      </Link>
    </div>
  );
}
    