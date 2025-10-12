import { create } from "zustand";
import { devtools} from 'zustand/middleware'
import { createPurchaseSlice, PurchaseSliceType } from "./purchaseSlice";

export const useAppStore = create<PurchaseSliceType>()( devtools( (...a) => ({
  ...createPurchaseSlice(...a),
})));
