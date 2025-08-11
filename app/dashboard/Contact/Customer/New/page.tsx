import AddCustomerForm from '@/components/contact/AddCustomerForm'
import CustomerForm from '@/components/contact/CustomerForm'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'

import React from 'react'

export default function page() {
    return (
        <ProtectedRoute allowedRoles={[1, 3, 4]}>
            <Heading >Nuevo Cliente</Heading>
            <div className='container mx-auto px-4 max-w-6xl'>
                <div className='w-full pt-5'>
                    <AddCustomerForm>
                        <CustomerForm />
                    </AddCustomerForm>
                </div>
            </div>
        </ProtectedRoute>
    )
}
