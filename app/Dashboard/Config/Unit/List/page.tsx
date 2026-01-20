import { ProtectedRoute } from '@/components/ProtectedRoute'
import Heading from '@/components/ui/Heading'
import React from 'react'

export default function page() {
    return (
        <ProtectedRoute allowedRoles={[1, 2]}>
            <Heading> Unidades de Medida </Heading>
            
        </ProtectedRoute>
    )
}
