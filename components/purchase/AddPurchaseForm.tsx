"use client"
import { Button, Form, Input } from "@heroui/react";
import React, { useState } from "react";
import { useAppStore } from "@/src/store/useAppStore";
import { generatePurchaseNumber } from "@/src/store/purchaseSlice";
import AddDetailPurchase from "./AddDetailPurchase";
import { createPurchaseAction } from "@/actions/purchase/create-purchase-action";

export default function AddPurchaseForm({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseNumber, setPurchaseNumber] = useState(() => generatePurchaseNumber());

  // Store actions
  const createPurchase = useAppStore((state) => state.createPurchase);
  const selectedSupplierId = useAppStore((state) => state.selectedSupplierId);
  const detailPurchase = useAppStore((state) => state.detailPurchase);
  const calculatePurchaseTotals = useAppStore((state) => state.calculatePurchaseTotals);
  const clearDetailPurchase = useAppStore((state) => state.clearDetailPurchase);
  const setSelectedSupplierId = useAppStore((state) => state.setSelectedSupplierId);
  const clearProductos = useAppStore((state) => state.clearProductos);

  const totals = calculatePurchaseTotals();
  const canSubmit = selectedSupplierId && detailPurchase.length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      alert('Por favor selecciona un proveedor y agrega al menos un producto');
      return;
    }

    setIsLoading(true);

    try {
      const usuarioId = 1;
      const purchaseData = await createPurchase(usuarioId);

      if (purchaseData) {
        const finalPurchaseData = {
          ...purchaseData,
          numeroCompra: purchaseNumber
        };

        const result = await createPurchaseAction(finalPurchaseData);

        if (result.success && result.data) {
          alert(`¡Compra creada exitosamente!\n` +
                `Número: ${result.data.numeroCompra}\n` +
                `Total: Bs. ${result.data.total.toFixed(2)}\n` +
                `Detalles creados: ${result.data.detallesCreados}\n` +
                `Lotes creados: ${result.data.lotesCreados}\n` +
                `Movimientos creados: ${result.data.movimientosCreados}`);

          // Limpiar el formulario
          clearDetailPurchase();
          setSelectedSupplierId(null);
          clearProductos();
          setPurchaseNumber(generatePurchaseNumber());
        } else {
          throw new Error(result.error || 'Error al crear la compra');
        }

      } else {
        throw new Error('Error al preparar los datos de la compra');
      }

    } catch (error) {
      console.error('Error al crear la compra:', error);
      alert('Error al crear la compra. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    clearDetailPurchase();
    setSelectedSupplierId(null);
    clearProductos();
    setPurchaseNumber(generatePurchaseNumber());
  };

  return (
    <div className="w-full bg-white/90 px-4 md:px-6 lg:px-8 py-6 rounded-xl shadow-lg">
      {/* Cabecera */}
      <div className="mb-6 border-b pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600">Número de Compra</label>
            <Input
              size="sm"
              value={purchaseNumber}
              onChange={(e) => setPurchaseNumber(e.target.value)}
              className="mt-1 w-full"
              placeholder="COMP-YYYYMMDD-XXXXXX"
            />
          </div>
          <div className="w-full md:col-span-2">
            <div className="text-sm text-gray-600 flex md:justify-end">
              <p className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-50 border"> 
                <strong className="mr-2">Fecha:</strong> {new Date().toLocaleDateString('es-BO')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Form className="w-full" onSubmit={handleSubmit}>
        {/* Formulario de selección de proveedor */}
        <div className="w-full">{children}</div>

        {/* Tabla de detalles de compra */}
        <AddDetailPurchase />

        {/* Resumen final y botones */}
        {detailPurchase.length > 0 && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl border">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold">Resumen Final</h3>
              <div className="text-sm text-gray-600">
                <p><strong>Total de productos:</strong> {detailPurchase.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">Bs. {totals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Descuento Total:</span><span className="font-medium text-red-600">- Bs. {totals.totalDescuento.toFixed(2)}</span></div>
                <div className="border-t pt-2"><div className="flex justify-between font-bold text-lg"><span>Total Final:</span><span className="text-blue-600">Bs. {totals.total.toFixed(2)}</span></div></div>
              </div>
              <div className="md:col-span-2 space-y-3 text-sm text-gray-700">
                <p><strong>Proveedor:</strong> {selectedSupplierId ? 'Seleccionado' : 'No seleccionado'}</p>
                <p><strong>Número de Compra:</strong> {purchaseNumber}</p>
                <p><strong>Estado:</strong> Lista para procesar</p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <Button 
            color="default" 
            variant="bordered"
            onPress={handleReset}
            isDisabled={isLoading}
          >
            Limpiar
          </Button>
          <Button 
            color="primary" 
            type="submit"
            isLoading={isLoading}
            isDisabled={!canSubmit}
          >
            {isLoading ? 'Procesando...' : 'Crear Compra'}
          </Button>
        </div>

        {/* Mensaje de ayuda */}
        {!canSubmit && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">Para crear la compra:</p>
            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1">
              <li>Selecciona un proveedor</li>
              <li>Agrega al menos un producto con su cantidad y precio</li>
              <li>Verifica que todos los lotes tengan número asignado</li>
            </ul>
          </div>
        )}
      </Form>
    </div>
  )
}