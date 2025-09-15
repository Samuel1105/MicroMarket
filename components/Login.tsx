'use client'
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Button,
  CircularProgress
} from "@heroui/react";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { toast } from "react-toastify";
import { handleLoginAction } from "@/actions/user/login-user-action";
import { useAuth } from "@/app/context/AuthContext";

export default function Login() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const result = await handleLoginAction(formData);
      
      if (result.success && result.data) {
        toast.success(result.data.message);
        login(result.data.data);
        router.push(result.redirectTo!);
      } else {
        if (result.errors) {
          result.errors.forEach(issue => toast.error(issue.message));
        } else {
          toast.error(result.error || "Ocurrió un error desconocido");
        }
      }
    } catch (error) {
      toast.error("Error inesperado al iniciar sesión");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row items-center justify-center p-4 bg-zinc-100">
      <Card className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg md:mr-8">
        <CardHeader className="flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">Iniciar Sesión</h2>
        </CardHeader>
        <Divider />
        <CardBody as="form" onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              fullWidth
              size="lg"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              fullWidth
              size="lg"
              placeholder="Ingresar 6 caracteres o más"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <Button
            type="submit"
            fullWidth
            color="primary"
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Iniciando..." : "Iniciar Sesión"}
          </Button>
          {isSubmitting && (
            <div className="flex justify-center mt-4">
              <CircularProgress aria-label="Loading..." />
            </div>
          )}
        </CardBody>
      </Card>
      <div className="hidden md:block">
        <Image src="/Image/logo.png" width={500} height={400} alt="Logo" />
      </div>
    </main>
  );
}