export type DeliveryVehicle = "bike" | "keke";

export type DeliveryPricingInput = {
  distanceKm: number;
  vehicle: DeliveryVehicle;
  cartTotal: number;
};

export function calculateDeliveryFee({
  distanceKm,
  vehicle,
  cartTotal,
}: DeliveryPricingInput): number {
  let baseFee = vehicle === "bike" ? 800 : 1200;

  let perKm =
    vehicle === "bike" ? 180 : 250;

  let distanceFee = Math.max(0, distanceKm - 2) * perKm;

  let orderTypeFee = 0;

  /*
   * Larger orders can attract an additional handling
   * charge. We will eventually calculate this using
   * actual package weight/volume from the products.
   */

  if (cartTotal >= 100000) {
    orderTypeFee += vehicle === "keke" ? 500 : 300;
  }

  const total =
    baseFee +
    distanceFee +
    orderTypeFee;

  return Math.round(total);
}