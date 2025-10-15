import { StateCreator } from "zustand";
import { CreatePurchaseRequest, ProductosListSchema, PurchaseDetailItem } from "../schema/SchemaPurchase";
import { SupplierList } from "../schema/SchemaContact";
import { ListSuppliers } from "@/actions/proveedores/list-supplier-action";
import { getProductsBySupplier } from "@/actions/purchase/product-list-action";

export type PurchaseSliceType = {
    // Proveedores
    proveedores: SupplierList
    fetchProveedores: () => Promise<void>

    // Productos por proveedor
    fetchProductosBySupplier: (supplierId: number) => Promise<void>;
    productosProveedor: ProductosListSchema
    clearProductos: () => void;

    // Detalles de la compra
    detailPurchase: PurchaseDetailItem[]
    setDetailPurchase: (detailPurchase: PurchaseDetailItem[]) => void
    clearDetailPurchase: () => void;

    // Proveedor seleccionado
    selectedSupplierId: number | null;
    setSelectedSupplierId: (supplierId: number | null) => void;

    // Funciones para calcular totales
    calculatePurchaseTotals: () => {
        subtotal: number;
        totalDescuento: number;
        total: number;
    };

    // Crear la compra
    createPurchase: (usuarioId: number) => Promise<CreatePurchaseRequest | null>;
};

export const createPurchaseSlice: StateCreator<PurchaseSliceType> = (set, get) => ({
    // Estado inicial
    proveedores: [],
    productosProveedor: [],
    detailPurchase: [],
    selectedSupplierId: null,

    // Fetch proveedores
    fetchProveedores: async () => {
        const proveedores = await ListSuppliers()
        set({
            proveedores: proveedores.data
        })
    },

    // Fetch productos por proveedor
    fetchProductosBySupplier: async (supplierId: number) => {
        const producto = await getProductsBySupplier(supplierId)
        console.log(producto)
        set({
            productosProveedor: producto.data
        })
    },

    // Limpiar productos
    clearProductos: () => {
        set({
            productosProveedor: [],
        });
    },

    // Gestión de detalles de compra
    setDetailPurchase: (detailPurchase) => set({ detailPurchase }),
    
    clearDetailPurchase: () => {
        set({ detailPurchase: [] });
    },

    // Proveedor seleccionado
    setSelectedSupplierId: (supplierId) => set({ selectedSupplierId: supplierId }),

    // Calcular totales
    calculatePurchaseTotals: () => {
        const details = get().detailPurchase;
        const subtotal = details.reduce((sum, detail) => sum + detail.subtotal, 0);
        const totalDescuento = details.reduce((sum, detail) => sum + detail.descuento, 0);
        const total = subtotal - totalDescuento;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalDescuento: Number(totalDescuento.toFixed(2)),
            total: Number(total.toFixed(2))
        };
    },

    // Crear la compra (preparar datos para enviar al backend)
    createPurchase: async (usuarioId: number) => {
        const state = get();
        const { detailPurchase, selectedSupplierId } = state;

        if (!selectedSupplierId || detailPurchase.length === 0) {
            console.error('Proveedor no seleccionado o no hay detalles de compra');
            return null;
        }

        const totals = state.calculatePurchaseTotals();

        const purchaseRequest: CreatePurchaseRequest = {
            proveedorID: selectedSupplierId,
            subtotal: totals.subtotal,
            descuento: totals.totalDescuento > 0 ? totals.totalDescuento : undefined,
            total: totals.total,
            usuarioIdRegistro: usuarioId,
            detalles: detailPurchase.map(detail => ({
                productoID: detail.productoId,
                unidadMedidaID: detail.unidadMedidaId,
                cantidadComprada: detail.cantidadComprada,
                precioUnitario: detail.precioUnitario,
                subtotal: detail.subtotal,
                descuento: detail.descuento > 0 ? detail.descuento : undefined,
                total: detail.total,
                lote: {
                    numeroLote: detail.numeroLote,
                    productoID: detail.productoId,
                    fechaVencimiento: detail.fechaVencimiento,
                    // Calcular cantidad en unidades base
                    cantidadInicialUnidadesBase: detail.cantidadComprada * detail.factorConversion,
                    usuarioIdRegistro: usuarioId
                }
            })),
            numeroCompra: ""
        };

        return purchaseRequest;
    }
});

// Función helper para generar número de compra
export const generatePurchaseNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = now.getTime().toString().slice(-6);
    
    return `COMP-${year}${month}${day}-${time}`;
};