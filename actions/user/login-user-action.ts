"use server"

import api from "@/src/lib/axios";
import { userLoginSchema } from "@/src/schema";
import axios from "axios";


export async function handleLoginAction(formData: FormData) {
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    // Validación con Zod
    const result = userLoginSchema.safeParse({ correo: email, contraseña:password });

    if (!result.success) {
        return { success: false, errors: result.error.issues };
    }

    try {

        //const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        //const apiUrl = `${baseUrl}/login`;
        const response = await api.post('/login', result.data);
        if (response.status === 200) {
            return {
                success: true,
                redirectTo: "/Dashboard",
                data: response.data,
            };
        }

        return {
            success: false,
            error: response.data?.message || "Credenciales incorrectas",
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message =
                error.response?.data?.message ||
                (error.request ? "No se pudo conectar al servidor" : "Error del servidor");
            return { success: false, error: message };
        }

        return { success: false, error: "Error inesperado durante el login" };
    }
}

