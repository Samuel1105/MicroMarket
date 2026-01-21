import React from 'react'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import AddUnitForm from '@/components/unit/AddUnitForm'
import UnitForm from '@/components/unit/UnitForm'


export default function page() {
  return (
    <ProtectedRoute allowedRoles={[1 ,2]}>
      <Heading> Nueva Unidad de Medida</Heading>
      <div className='container mx-auto px-4 max-w-6xl'>
        <div className='w-full pt-5'>
          <AddUnitForm>
            <UnitForm />
          </AddUnitForm>
        </div>

      </div>
    </ProtectedRoute>
  )
}
