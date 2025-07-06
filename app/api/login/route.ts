// app/api/login/route.ts
import { prisma } from "@/src/lib/prisma";
import { checkPassword } from "@/src/utils/auth";
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
        id:true,
        primerNombre: true,
        segundoNombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        celular: true,
        correo: true,
        contrase_a: true,
        rol: true,
        estado: true

      },
      where: {
        correo: correo,
        estado: 1,
        //contrase_a: contraseña // Nota: revisa si este campo está bien escrito en tu schema
      }

    });
    
    if (!persona) {
      return NextResponse.json({
        message: "Credenciales incorrectas"
      }, { status: 401 });
    }
    
    // Verificar contraseña
    const passwordMatch = await checkPassword(contraseña, persona?.contrase_a);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contrase_a, ...userData } = persona;

    if (passwordMatch) {
      return NextResponse.json({
        message: "Login exitoso",
        data: userData
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