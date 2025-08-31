import { ProtectedRoute } from "@/components/ProtectedRoute";


export default function page() {
  return (

    <ProtectedRoute allowedRoles={[1,2,3,4,5]}>
      <h2>
        HOLA 
      </h2>
    </ProtectedRoute>


  )
}
