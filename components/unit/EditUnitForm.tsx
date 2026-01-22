"use client";

import { useAuth } from "@/app/context/AuthContext";
import { SchemaUpdateUnit, UnitUpdate } from "@/src/schema/SchemaUnit";
import { Button, Form } from "@heroui/react";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";


export default function EditUnitForm({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user } = useAuth();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        if (!user) {
            return;
        }
        const data: UnitUpdate = {
            id: parseInt((formData.get("id") as string) || ""),
            nombre: (formData.get("nombre") as string) || "",
            abreviatura: (formData.get("abreviatura") as string) || "",
        };
        const result = SchemaUpdateUnit.safeParse(data);

        if (!result.success) {
            result.error.issues.forEach((issue) => {
                toast.error(issue.message);
            });

            return;
        }

        //const response = await updateCustomerAction(result.data);

        // if (response?.error) {
        //     toast.error(response.error);

        //     return;
        // }

        // if (response?.success) {
        //     toast.success(response.message);
        //     router.push("/Dashboard/Contact/Customer/List");
        // }
    };

    return (
        <div className="bg-white px-8 py-10 rounded-lg shadow-large w-full">
            <Form className="w-full" onSubmit={handleSubmit}>
                <div className="w-full">{children}</div>
                <div className="mt-5 w-full space-x-5">
                    <Button className="mt-4" color="primary" type="submit">
                        Guardar Cambios
                    </Button>
                    <Button
                        className="mt-4"
                        color="danger"
                        onPress={() => router.push("/Dashboard/Config/Unit/List")}
                    >
                        Cancelar
                    </Button>
                </div>
            </Form>
        </div>
    );
}
