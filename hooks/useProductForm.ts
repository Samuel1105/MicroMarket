"use client"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productoCompleteFormSchema, ProductoCompleteForm, ProductoApiData } from '@/src/schema/SchemaProduts';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/actions/products/create-product-action';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/context/AuthContext';

export const useProductForm = () => {
    const router = useRouter();
    const {user} = useAuth()
    
    

    const methods = useForm<ProductoCompleteForm>({
        resolver: zodResolver(productoCompleteFormSchema),
        defaultValues: {
            nombre: '',
            descripcion: '',
            categoriaID: '',
            proveedorID: '',
            requiereNumeroSerie: false,
            conversiones: [
                { 
                    unidadOrigenID: '', 
                    factorConversion: 1, 
                    precioVentaUnitario: 0, 
                    esUnidadBase: true 
                }
            ]
        },
        mode: 'onChange'
    });

    const processFormData = async (data: ProductoCompleteForm) => {
        try {
            console.log('🔄 Procesando datos del formulario...');
            
            // Transformar los datos para la API según tu esquema de base de datos
            const apiData: ProductoApiData = {
                producto: {
                    nombre: data.nombre.trim(),
                    descripcion: data.descripcion?.trim(),
                    categoriaID: parseInt(data.categoriaID),
                    proveedorID: parseInt(data.proveedorID),
                    unidadBaseID: parseInt(data.conversiones[0].unidadOrigenID),
                    requiereNumeroSerie: data.requiereNumeroSerie || false,
                    usuarioRegistro: user?.id || 1,
                },
                conversiones: data.conversiones
                    .filter(c => c.unidadOrigenID && c.factorConversion > 0)
                    .map((c, index) => ({
                        unidadOrigenID: parseInt(c.unidadOrigenID),
                        // Para la primera conversión (unidad base), origen y destino son iguales
                        unidadDestinoID: index === 0 
                            ? parseInt(c.unidadOrigenID) 
                            : parseInt(data.conversiones[0].unidadOrigenID),
                        factorConversion: c.factorConversion,
                        precioVentaUnitario: c.precioVentaUnitario,
                        estado: 1
                    })),
            };

            console.log('🚀 Datos para enviar a la API:');
            console.log('📦 Producto:', apiData.producto);
            console.log('🔄 Conversiones:', apiData.conversiones);
            console.log('📋 JSON completo:', JSON.stringify(apiData, null, 2));
            
            // Aquí llamarías a tu action o API
            const result = await createProductAction(apiData);
            
            if(result.ok){
                toast.success("Producto Creado Existosamente")
            }

            // Simular respuesta exitosa
            alert('✅ Producto registrado exitosamente! Revisa la consola para ver los datos.');
            
            // Opcional: limpiar el formulario
            // methods.reset();
            
            // Opcional: redirigir al listado de productos
            // router.push('/Dashboard/Product/List');
            
        } catch (error) {
            console.error('❌ Error al crear producto:', error);
            alert('Error al crear el producto. Por favor, intenta nuevamente.');
        }
    };

    const onSubmit = methods.handleSubmit(processFormData);

    return {
        ...methods,
        onSubmit
    };
};