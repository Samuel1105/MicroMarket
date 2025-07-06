// app/api/login/route.ts
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { correo, contraseña } = await request.json();

    // Validación básica
    if (!correo || !contraseña) {
      return NextResponse.json(
        { message: "Correo y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const persona = await prisma.persona.findFirst({
      select: {
        primerNombre: true,
        segundoNombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        celular: true,
        correo:true,
        rol: true,
        estado: true

      },
      where: {
        correo: correo,
        contrase_a: contraseña // Nota: revisa si este campo está bien escrito en tu schema
      }
      
    });

    if (persona) {
      return NextResponse.json({
        message: "Login exitoso",
        data: persona
      }, { status: 200 });
    } else {
      return NextResponse.json({
        message: "Credenciales incorrectas"
      }, { status: 401 }); // 401 es más apropiado para credenciales incorrectas
    }
  } catch (error) {
    console.error("Error en login:", error);

    // Manejo más específico de errores
    if (error instanceof Error) {
      return NextResponse.json({
        message: "Error interno del servidor",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    return NextResponse.json({
      message: "Error desconocido"
    }, { status: 500 });
  }
}