import Heading from '@/components/ui/Heading'
import AddUserForm from '@/components/users/AddUserForm'
import UserForm from '@/components/users/UserForm'

export default function CreateUserPage() {
  return (
    <>
      <Heading >Nuevo Usuario</Heading>
      <div className="container mx-auto px-4  max-w-6xl">
         
        <div className="w-full pt-5">
          <AddUserForm>
            <UserForm />
          </AddUserForm>
        </div>
      </div>
    </>

  )
}