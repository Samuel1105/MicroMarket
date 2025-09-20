import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";

export default function page() {
  return (
    <ProtectedRoute allowedRoles={[1, 3, 4]}>
      <Heading> Registrar una nueva Compra</Heading>
    </ProtectedRoute>
  );
}
