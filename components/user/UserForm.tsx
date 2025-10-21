"use client";
import { Input, Select, SelectItem } from "@heroui/react";
import { Persona } from "@prisma/client";

export const roles = [
  { key: "1", label: "Administrador" },
  { key: "2", label: "Cajero" },
  { key: "3", label: "Almacén" },
  { key: "4", label: "Reportes" },
  { key: "5", label: "Compras" },
];

type UserFormProps = {
  usuario?: Persona;
};

export default function UserForm({ usuario }: UserFormProps) {
  const isEditing = !!usuario;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={usuario?.primerNombre || ""}
            label="Primer Nombre"
            name="primerNombre"
          />
        </div>

        <div className="w-full">
          <Input
            className="w-full"
            defaultValue={usuario?.segundoNombre || ""}
            label="Segundo Nombre (opcional)"
            name="segundoNombre"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={usuario?.apellidoPaterno || ""}
            label="Apellido Paterno"
            name="apellidoPaterno"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={usuario?.apellidoMaterno || ""}
            label="Apellido Materno"
            name="apellidoMaterno"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={usuario?.correo || ""}
            label="Correo Electrónico"
            name="correo"
            type="email"
          />
        </div>

        <div className="w-full">
          <Input
            className="w-full"
            label={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
            name="contraseña"
            placeholder={
              isEditing ? "Dejar en blanco para mantener actual" : ""
            }
            required={!isEditing}
            type="password"
          />
        </div>

        <div className="w-full">
          <Input
            required
            className="w-full"
            defaultValue={usuario?.celular?.toString() || ""}
            label="Teléfono Celular"
            name="celular"
            type="tel"
          />
        </div>

        <div className="w-full">
          <Select
            isRequired
            className="w-full"
            defaultSelectedKeys={
              usuario?.rol ? [usuario.rol.toString()] : undefined
            }
            label="Rol del Usuario"
            name="rol"
            placeholder="Seleccione un rol"
          >
            {roles.map((rol) => (
              <SelectItem key={rol.key} textValue={rol.label}>
                {rol.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        {/* Campo oculto para el ID en caso de edición */}
        {isEditing && <input name="id" type="hidden" value={usuario.id} />}
      </div>
    </div>
  );
}
