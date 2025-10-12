"use client"
import React from 'react';
import { useAppStore } from '@/src/store/useAppStore';
import PurchaseDetailTable from './PurchaseDetailTable';

export default function AddDetailPurchase() {
  const productosProveedor = useAppStore((state) => state.productosProveedor);
  const detailPurchase = useAppStore((state) => state.detailPurchase);
  const setDetailPurchase = useAppStore((state) => state.setDetailPurchase);

  return (
    <div className="mt-6 w-full">
      <PurchaseDetailTable 
        products={productosProveedor}
        details={detailPurchase}
        onDetailsChange={setDetailPurchase}
      />
    </div>
  );
}