// PurchaseForm.tsx
"use client"
import { useAppStore } from '@/src/store/useAppStore';
import { Select, SelectItem, Chip, Card, CardBody } from '@heroui/react'
import React, { useEffect } from 'react'

export default function PurchaseForm() {
  const fecthProveedores = useAppStore((state) => state.fetchProveedores)
  const proveedores = useAppStore((state) => state.proveedores)
  const fetchProductosBySupplier = useAppStore((state) => state.fetchProductosBySupplier)
  const productosProveedor = useAppStore((state) => state.productosProveedor)
  const clearProductos = useAppStore((state) => state.clearProductos)
  const selectedSupplierId = useAppStore((state) => state.selectedSupplierId)
  const setSelectedSupplierId = useAppStore((state) => state.setSelectedSupplierId)
  const calculatePurchaseTotals = useAppStore((state) => state.calculatePurchaseTotals)
  const detailPurchase = useAppStore((state) => state.detailPurchase)

  useEffect(() => {
    fecthProveedores();
  }, [fecthProveedores]);

  const handleSupplierChange = async (supplierId: string) => {
    if (supplierId) {
      const id = Number(supplierId);
      setSelectedSupplierId(id);
      await fetchProductosBySupplier(id);
    } else {
      setSelectedSupplierId(null);
      clearProductos();
    }
  };

  const selectedSupplier = proveedores.find(p => p.id === selectedSupplierId);
  const totals = calculatePurchaseTotals();

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardBody className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda: Selección de proveedor */}
            <div className="space-y-4">
              <Select
                label="Selecciona un proveedor"
                placeholder="Elige un proveedor"
                selectedKeys={selectedSupplierId ? [selectedSupplierId.toString()] : []}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0] as string;
                  handleSupplierChange(selectedKey || "");
                }}
                isRequired
                className="w-full"
                classNames={{ base: "w-full", trigger: "h-12" }}
              >
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id.toString()}>
                    {proveedor.nombre}
                  </SelectItem>
                ))}
              </Select>

              {selectedSupplier && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Información del Proveedor</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Nombre:</span><span className="font-medium text-gray-900">{selectedSupplier.nombre}</span></div>
                    {selectedSupplier.correo && (<div className="flex justify-between"><span className="text-gray-600">Correo:</span><span className="font-medium text-gray-900">{selectedSupplier.correo}</span></div>)}
                    {selectedSupplier.celular && (<div className="flex justify-between"><span className="text-gray-600">Celular:</span><span className="font-medium text-gray-900">{selectedSupplier.celular}</span></div>)}
                    {selectedSupplier.direccion && (<div className="flex justify-between"><span className="text-gray-600">Dirección:</span><span className="font-medium text-gray-900 text-right">{selectedSupplier.direccion}</span></div>)}
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha: Resumen */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-900 text-sm">Productos Disponibles</h4>
                  <Chip 
                    color={productosProveedor.length > 0 ? "success" : "default"} 
                    variant="flat"
                    size="sm"
                  >
                    {productosProveedor.length} producto(s)
                  </Chip>
                </div>
              </div>

             
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}