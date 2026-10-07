import MapView, { Marker } from "react-native-maps";

type Location = {
  latitude: number;
  longitude: number;
};

type DeliveryMapProps = {
  customerLocation: Location;
  marketplaceLocation: Location;
};

export default function DeliveryMap({
  customerLocation,
  marketplaceLocation,
}: DeliveryMapProps) {
  return (
    <MapView
      style={{
        width: "100%",
        height: "100%",
      }}
      initialRegion={{
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }}
    >
      <Marker
        coordinate={customerLocation}
        title="Delivery Location"
        description="Customer delivery location"
      />

      <Marker
        coordinate={marketplaceLocation}
        title="Marketplace Pickup"
        description="Pickup location"
      />
    </MapView>
  );
}