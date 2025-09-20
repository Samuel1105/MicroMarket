import { create } from "zustand";

import { createPurchaseSlice, PurchaseSliceType } from "./purchaseSlice";

export const useAppStore = create<PurchaseSliceType>((...a) => ({
  ...createPurchaseSlice(...a),
}));
