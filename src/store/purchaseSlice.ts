import { StateCreator } from "zustand";

import { DetailPurchase } from "../schema/SchemaPurchase";

export type PurchaseSliceType = {
  detailPurchase: DetailPurchase[];
};

export const createPurchaseSlice: StateCreator<PurchaseSliceType> = () => ({
  detailPurchase: [],
});
