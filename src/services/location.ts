import * as Location from "expo-location";

export type UserLocation = {
  latitude: number;
  longitude: number;
};

export async function getCurrentUserLocation(): Promise<UserLocation> {
  const { status } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error(
      "Location permission was not granted."
    );
  }

  const location =
    await Location.getCurrentPositionAsync({
      accuracy:
        Location.Accuracy.High,
    });

  return {
    latitude:
      location.coords.latitude,

    longitude:
      location.coords.longitude,
  };
}

export function calculateDistanceKm(
  point1: UserLocation,
  point2: UserLocation
): number {
  const earthRadiusKm = 6371;

  const latitudeDifference =
    ((point2.latitude -
      point1.latitude) *
      Math.PI) /
    180;

  const longitudeDifference =
    ((point2.longitude -
      point1.longitude) *
      Math.PI) /
    180;

  const a =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(
      (point1.latitude *
        Math.PI) /
        180
    ) *
      Math.cos(
        (point2.latitude *
          Math.PI) /
          180
      ) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}