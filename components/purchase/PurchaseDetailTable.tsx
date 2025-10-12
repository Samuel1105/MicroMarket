import React, { useState } from 'react';
import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Select, SelectItem, Chip } from '@heroui/react';
import { ProductoConUnidades, PurchaseDetailItem, UnidadProducto } from '@/src/schema/SchemaPurchase';

interface PurchaseDetailTableProps {
  products: ProductoConUnidades[];
  details: PurchaseDetailItem[];
  onDetailsChange: (details: PurchaseDetailItem[]) => void;
}

export default function PurchaseDetailTable({ products, details, onDetailsChange }: PurchaseDetailTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnidadProducto | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [loteNumber, setLoteNumber] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const handleProductChange = (productId: string) => {
    const id = Number(productId);
    setSelectedProduct(id);
    setSelectedUnit(null);
    setUnitPrice(0);
    const product = products.find(p => p.id === id);
    if (product) {
      const now = new Date();
      const loteNum = `LOTE-${product.nombre.substring(0, 3).toUpperCase()}-${now.getTime().toString().slice(-6)}`;
      setLoteNumber(loteNum);
    }
  };

  const handleUnitChange = (unitId: string) => {
    if (!selectedProductData) return;
    const unit = selectedProductData.unidades.find(u => u.unidadId === Number(unitId));
    if (unit) {
      setSelectedUnit(unit);
      setUnitPrice(unit.precio);
    }
  };

  const calculateSubtotal = () => quantity * unitPrice;
  const calculateTotal = () => Math.max(0, calculateSubtotal() - discount);

  const addDetail = () => {
    if (!selectedProductData || !selectedUnit || !loteNumber.trim()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const newDetail: PurchaseDetailItem = {
      id: Date.now().toString(),
      productoId: selectedProductData.id,
      productoNombre: selectedProductData.nombre,
      unidadMedidaId: selectedUnit.unidadId,
      unidadNombre: selectedUnit.nombre,
      unidadAbreviatura: selectedUnit.abreviatura ?? "",
      factorConversion: selectedUnit.factor,
      cantidadComprada: quantity,
      precioUnitario: unitPrice,
      subtotal: calculateSubtotal(),
      descuento: discount,
      total: calculateTotal(),
      numeroLote: loteNumber,
      fechaVencimiento: expirationDate ? new Date(expirationDate) : undefined
    };

    onDetailsChange([...details, newDetail]);

    setSelectedProduct(null);
    setSelectedUnit(null);
    setQuantity(1);
    setUnitPrice(0);
    setDiscount(0);
    setLoteNumber('');
    setExpirationDate('');
  };

  const removeDetail = (id: string) => onDetailsChange(details.filter(detail => detail.id !== id));

  const updateDetail = (id: string, field: keyof PurchaseDetailItem, value: any) => {
    const updatedDetails = details.map(detail => {
      if (detail.id === id) {
        const updated = { ...detail, [field]: value };
        if (field === 'cantidadComprada' || field === 'precioUnitario' || field === 'descuento') {
          updated.subtotal = updated.cantidadComprada * updated.precioUnitario;
          updated.total = Math.max(0, updated.subtotal - updated.descuento);
        }
        return updated;
      }
      return detail;
    });
    onDetailsChange(updatedDetails);
  };

  const getTotalPurchase = () => details.reduce((total, detail) => total + detail.total, 0);

  return (
    <div className="w-full space-y-6">
      {/* Formulario para agregar productos */}
      <div className="bg-gray-50 p-4 rounded-xl border">
        <h3 className="text-lg font-semibold mb-4">Agregar Producto a la Compra</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Selección de producto */}
          <Select
            label="Producto"
            placeholder="Selecciona un producto"
            selectedKeys={selectedProduct ? [selectedProduct.toString()] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              handleProductChange(selectedKey);
            }}
            className="w-full"
          >
            {products.map((product) => (
              <SelectItem key={product.id.toString()}>
                {product.nombre}
              </SelectItem>
            ))}
          </Select>

          {/* Selección de unidad */}
          <Select
            label="Unidad de Medida"
            placeholder="Selecciona unidad"
            isDisabled={!selectedProductData}
            selectedKeys={selectedUnit ? [selectedUnit.unidadId.toString()] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              handleUnitChange(selectedKey);
            }}
            className="w-full"
          >
            {selectedProductData?.unidades.map((unit) => (
              <SelectItem key={unit.unidadId.toString()}>
                {unit.nombre} ({unit.abreviatura}) - Factor: {unit.factor}
              </SelectItem>
            )) || []}
          </Select>

          {/* Cantidad */}
          <Input
            type="number"
            label="Cantidad"
            placeholder="0"
            min="0.01"
            step="0.01"
            value={quantity.toString()}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            className="w-full"
          />

          {/* Precio unitario */}
          <Input
            type="number"
            label="Precio Unitario"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={unitPrice.toString()}
            onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
            startContent={<span className="text-gray-500">Bs.</span>}
            className="w-full"
          />

          {/* Descuento */}
          <Input
            type="number"
            label="Descuento"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={discount.toString()}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            startContent={<span className="text-gray-500">Bs.</span>}
            className="w-full"
          />

          {/* Número de lote */}
          <Input
            label="Número de Lote"
            placeholder="LOTE-XXX-YYYY"
            value={loteNumber}
            onChange={(e) => setLoteNumber(e.target.value)}
            isRequired
            className="w-full"
          />

          {/* Fecha de vencimiento */}
          <Input
            type="date"
            label="Fecha de Vencimiento"
            placeholder="Opcional"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Resumen y botón agregar */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mt-4 p-3 bg-white rounded-xl border gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>Subtotal: <strong>Bs. {calculateSubtotal().toFixed(2)}</strong></span>
            <span>Descuento: <strong>Bs. {discount.toFixed(2)}</strong></span>
            <span>Total: <strong>Bs. {calculateTotal().toFixed(2)}</strong></span>
          </div>
          <Button 
            color="primary" 
            onPress={addDetail}
            isDisabled={!selectedProduct || !selectedUnit || !loteNumber.trim()}
          >
            Agregar
          </Button>
        </div>
      </div>

      {/* Tabla de detalles */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h3 className="text-lg font-semibold">Detalles de la Compra</h3>
          <Chip color="primary" variant="flat">Total General: Bs. {getTotalPurchase().toFixed(2)}</Chip>
        </div>

        {/* --- MOBILE (< md): Cards apiladas y editables --- */}
        <div className="md:hidden space-y-3">
          {details.length === 0 ? (
            <div className="p-4 bg-white rounded-xl border text-center text-gray-500">No hay productos agregados</div>
          ) : (
            details.map((detail) => (
              <div key={detail.id} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold leading-tight">{detail.productoNombre}</p>
                    <p className="text-xs text-gray-500">{detail.unidadNombre} ({detail.unidadAbreviatura}) • Factor {detail.factorConversion}</p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    onPress={() => removeDetail(detail.id)}
                    aria-label="Eliminar detalle"
                  >
                    ×
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    size="sm"
                    label="Cantidad"
                    min="0.01"
                    step="0.01"
                    value={detail.cantidadComprada.toString()}
                    onChange={(e) => updateDetail(detail.id, 'cantidadComprada', Number(e.target.value) || 0)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    size="sm"
                    label="Precio Unit."
                    min="0"
                    step="0.01"
                    value={detail.precioUnitario.toString()}
                    onChange={(e) => updateDetail(detail.id, 'precioUnitario', Number(e.target.value) || 0)}
                    className="w-full"
                  />
                  <Input
                    type="number"
                    size="sm"
                    label="Descuento"
                    min="0"
                    step="0.01"
                    value={detail.descuento.toString()}
                    onChange={(e) => updateDetail(detail.id, 'descuento', Number(e.target.value) || 0)}
                    className="w-full col-span-2"
                  />
                  <Input
                    size="sm"
                    label="N° Lote"
                    value={detail.numeroLote}
                    onChange={(e) => updateDetail(detail.id, 'numeroLote', e.target.value)}
                    className="w-full col-span-2"
                  />
                  <Input
                    type="date"
                    size="sm"
                    label="Vencimiento"
                    value={detail.fechaVencimiento ? detail.fechaVencimiento.toISOString().split('T')[0] : ''}
                    onChange={(e) => updateDetail(detail.id, 'fechaVencimiento', e.target.value ? new Date(e.target.value) : undefined)}
                    className="w-full col-span-2"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-sm">Subtotal: <strong>Bs. {detail.subtotal.toFixed(2)}</strong></p>
                  <p className="text-base font-bold">Total: Bs. {detail.total.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- DESKTOP (md+): Tabla completa con scroll --- */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table aria-label="Detalles de compra" className="min-w-[820px]">
              <TableHeader>
                <TableColumn>PRODUCTO</TableColumn>
                <TableColumn>UNIDAD</TableColumn>
                <TableColumn>CANTIDAD</TableColumn>
                <TableColumn>PRECIO UNIT.</TableColumn>
                <TableColumn>SUBTOTAL</TableColumn>
                <TableColumn>DESCUENTO</TableColumn>
                <TableColumn>TOTAL</TableColumn>
                <TableColumn>LOTE</TableColumn>
                <TableColumn>VENCIMIENTO</TableColumn>
                <TableColumn>ACCIONES</TableColumn>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-500">
                      No hay productos agregados
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="whitespace-nowrap">{detail.productoNombre}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {detail.unidadNombre} ({detail.unidadAbreviatura})
                        <br />
                        <small className="text-gray-500">Factor: {detail.factorConversion}</small>
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        <Input
                          type="number"
                          size="sm"
                          min="0.01"
                          step="0.01"
                          value={detail.cantidadComprada.toString()}
                          onChange={(e) => updateDetail(detail.id, 'cantidadComprada', Number(e.target.value) || 0)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <Input
                          type="number"
                          size="sm"
                          min="0"
                          step="0.01"
                          value={detail.precioUnitario.toString()}
                          onChange={(e) => updateDetail(detail.id, 'precioUnitario', Number(e.target.value) || 0)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">Bs. {detail.subtotal.toFixed(2)}</TableCell>
                      <TableCell className="max-w-[140px]">
                        <Input
                          type="number"
                          size="sm"
                          min="0"
                          step="0.01"
                          value={detail.descuento.toString()}
                          onChange={(e) => updateDetail(detail.id, 'descuento', Number(e.target.value) || 0)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><strong>Bs. {detail.total.toFixed(2)}</strong></TableCell>
                      <TableCell className="max-w-[200px]">
                        <Input
                          size="sm"
                          value={detail.numeroLote}
                          onChange={(e) => updateDetail(detail.id, 'numeroLote', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <Input
                          type="date"
                          size="sm"
                          value={detail.fechaVencimiento ? detail.fechaVencimiento.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateDetail(detail.id, 'fechaVencimiento', e.target.value ? new Date(e.target.value) : undefined)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="light"
                          onPress={() => removeDetail(detail.id)}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}