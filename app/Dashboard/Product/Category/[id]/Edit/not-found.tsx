import { Button } from "@heroui/react";
import Link from "next/link";

import Heading from "@/components/ui/Heading";

export default function NotFound() {
  return (
    <div className="text-center ">
      <Heading> Categoria no Encontrado</Heading>
      <Link className="mt-5" href="/Dashboard/Product/Category/List">
        <Button className="mt-5" color="primary">
          Volver a Categorias
        </Button>
      </Link>
    </div>
  );
}
