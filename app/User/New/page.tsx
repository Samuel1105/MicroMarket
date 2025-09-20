import { ProtectedRoute } from "@/components/ProtectedRoute";
import Heading from "@/components/ui/Heading";
import AddUserForm from "@/components/user/AddUserForm";
import UserForm from "@/components/user/UserForm";

export default function CreateUserPage() {
  return (
    <ProtectedRoute allowedRoles={[1]}>
      <Heading>Nuevo Usuario</Heading>
      <div className="container mx-auto px-4  max-w-6xl">
        <div className="w-full pt-5">
          <AddUserForm>
            <UserForm />
          </AddUserForm>
        </div>
      </div>
    </ProtectedRoute>
  );
}
