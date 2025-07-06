'use client'
import { Input, Select, SelectItem } from "@heroui/react";
import { Persona } from "@prisma/client";

export const roles = [
    { key: "1", label: "Administrador" },
    { key: "2", label: "Cajero" },
    { key: "3", label: "Almacen" },
    { key: "4", label: "Reportes" },
    { key: "5", label: "Compras" }
];

type UserFormProps = {
    usuario?: Persona
}

export default function UserForm({ usuario }: UserFormProps) {
    const isEditing = !!usuario;
    
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="w-full">
                    <Input
                        label="Primer Nombre"
                        name="primerNombre"
                        required
                        className="w-full"
                        defaultValue={usuario?.primerNombre || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Segundo Nombre (opcional)"
                        name="segundoNombre"
                        className="w-full"
                        defaultValue={usuario?.segundoNombre || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Apellido Paterno"
                        name="apellidoPaterno"
                        required
                        className="w-full"
                        defaultValue={usuario?.apellidoPaterno || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Apellido Materno"
                        name="apellidoMaterno"
                        required
                        className="w-full"
                        defaultValue={usuario?.apellidoMaterno || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Correo Electrónico"
                        type="email"
                        name="correo"
                        required
                        className="w-full"
                        defaultValue={usuario?.correo || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
                        type="password"
                        name="contraseña"
                        required={!isEditing}
                        className="w-full"
                        placeholder={isEditing ? "Dejar en blanco para mantener actual" : ""}
                    />
                </div>
                
                <div className="w-full">
                    <Input
                        label="Teléfono Celular"
                        type="tel"
                        name="celular"
                        required
                        className="w-full"
                        defaultValue={usuario?.celular?.toString() || ""}
                    />
                </div>
                
                <div className="w-full">
                    <Select
                        label="Rol del Usuario"
                        placeholder="Seleccione un rol"
                        className="w-full"
                        name="rol"
                        isRequired
                        defaultSelectedKeys={usuario?.rol ? [usuario.rol.toString()] : undefined}
                    >
                        {roles.map((rol) => (
                            <SelectItem key={rol.key} textValue={rol.label}>
                                {rol.label}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
                
                {/* Campo oculto para el ID en caso de edición */}
                {isEditing && (
                    <input type="hidden" name="id" value={usuario.id} />
                )}
            </div>
        </div>
    );
}