import React, {
    createContext,
    useContext,
    useMemo,
    useState,
} from "react";

import type { DeliveryVehicle } from "../services/deliveryPricing";

export type CheckoutLocation = {
  latitude: number;
  longitude: number;
};

export type CheckoutOrderItem = {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutPickupStopItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type CheckoutPickupStop = {
  sellerId: string;
  sellerName: string;
  latitude: number;
  longitude: number;
  items: CheckoutPickupStopItem[];
};

export type CheckoutDraft = {
  customerName: string;
  phone: string;
  address: string;

  customerLocation: CheckoutLocation;

  items: CheckoutOrderItem[];

  pickupStops: CheckoutPickupStop[];

  vehicle: DeliveryVehicle;

  distanceKm: number;

  subtotal: number;

  deliveryFee: number;

  total: number;
};

type CheckoutContextType = {
  checkoutDraft: CheckoutDraft | null;

  saveCheckoutDraft: (
    draft: CheckoutDraft
  ) => void;

  clearCheckoutDraft: () => void;
};

const CheckoutContext =
  createContext<
    CheckoutContextType | undefined
  >(undefined);

export function CheckoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checkoutDraft, setCheckoutDraft] =
    useState<CheckoutDraft | null>(null);

  function saveCheckoutDraft(
    draft: CheckoutDraft
  ) {
    setCheckoutDraft(draft);
  }

  function clearCheckoutDraft() {
    setCheckoutDraft(null);
  }

  const value = useMemo(
    () => ({
      checkoutDraft,
      saveCheckoutDraft,
      clearCheckoutDraft,
    }),
    [checkoutDraft]
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context =
    useContext(CheckoutContext);

  if (!context) {
    throw new Error(
      "useCheckout must be used inside CheckoutProvider"
    );
  }

  return context;
}