export type UserRole =
  | "customer"
  | "seller"
  | "rider"
  | "admin";

export type VehicleType =
  | "bike"
  | "keke";

export type UserStatus =
  | "active"
  | "suspended"
  | "inactive";

export type RiderAvailability =
  | "offline"
  | "online"
  | "available"
  | "busy";

export type OrderStatus =
  | "pending"
  | "dispatching"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type DeliveryStatus =
  | "awaiting_rider"
  | "assigned"
  | "going_to_pickup"
  | "at_pickup"
  | "picked_up"
  | "going_to_customer"
  | "at_customer"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export type GPSLocation = {
  latitude: number;
  longitude: number;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type Seller = {
  id: string;
  userId?: string;
  name: string;
  phone?: string;
  location: GPSLocation;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  sellerId: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type PickupStop = {
  id: string;
  sellerId: string;
  sellerName: string;
  location: GPSLocation;

  items: {
    productId: string;
    productName: string;
    quantity: number;
  }[];

  status:
    | "pending"
    | "arrived"
    | "picked_up";
};

export type Rider = {
  id: string;
  userId?: string;
  name: string;
  phone?: string;
  vehicle: VehicleType;
  rating: number;
  location: GPSLocation;
  availability: RiderAvailability;
  currentOrderId?: string;
  createdAt: string;
  updatedAt: string;
};

export type RiderLocation = {
  riderId: string;
  location: GPSLocation;
  speedKmh?: number;
  heading?: number;
  accuracyMeters?: number;
  timestamp: string;
};

export type Delivery = {
  id: string;
  orderId: string;
  riderId?: string;
  status: DeliveryStatus;
  vehicle: VehicleType;
  pickupStops: PickupStop[];
  customerLocation: GPSLocation;
  currentLocation?: GPSLocation;
  distanceKm: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
};

export type DispatchAssignment = {
  id: string;
  orderId: string;
  riderId: string;
  score: number;
  assignedAt: string;

  status:
    | "assigned"
    | "accepted"
    | "rejected"
    | "completed";
};

export type Payment = {
  id: string;
  orderId: string;
  amount: number;
  currency: "NGN";
  status: PaymentStatus;
  provider?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommunityOrder = {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  customerLocation: GPSLocation;

  items: OrderItem[];

  pickupStops: PickupStop[];

  vehicle: VehicleType;

  distanceKm: number;
  subtotal: number;
  deliveryFee: number;
  total: number;

  status: OrderStatus;

  deliveryId?: string;
  paymentId?: string;
  assignedRiderId?: string;

  createdAt: string;
  updatedAt: string;
};