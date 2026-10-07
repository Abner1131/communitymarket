import CustomerOrdersList from "../components/CustomerOrdersList";

// "My Orders": every user (customer, seller, rider, admin) sees the orders
// they bought, live from the server. Sellers manage shop orders on the
// Seller Dashboard and riders their trips on the Rider Dashboard.
export default function OrdersScreen() {
  return <CustomerOrdersList />;
}
