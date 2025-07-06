'use client'
import { Input, Select, SelectItem } from "@heroui/react";

export const roles = [
    { key: "1", label: "Administrador" },
    { key: "2", label: "Cajero" },
    { key: "3", label: "Almacen" },
    { key: "4", label: "Reportes" },
    { key: "5", label: "Compras" }
];

export default function UserForm() {
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="w-full">
                    <Input
                        label="Primer Nombre"
                        name="primerNombre"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Segundo Nombre (opcional)"
                        name="segundoNombre"
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Apellido Paterno"
                        name="apellidoPaterno"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Apellido Materno"
                        name="apellidoMaterno"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        name="correo"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Contraseña"
                        type="password"
                        name="contraseña"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Teléfono Celular"
                        type="tel"
                        name="celular"
                        required
                        className="w-full"
                    />
                </div>
                
                <div className="w-full">
                    <Select 
                        label="Rol del Usuario" 
                        placeholder="Seleccione un rol"
                        className="w-full"
                        name="rol"
                        isRequired
                    >
                        {roles.map((rol) => (
                            <SelectItem key={rol.key} textValue={rol.label} >
                                {rol.label}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </div>
            
            
        </div>
    );
}