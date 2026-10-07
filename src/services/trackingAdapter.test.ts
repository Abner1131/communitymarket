import {
  createRiderTrackingUpdate,
} from "./trackingAdapter";

function assert(
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runTrackingAdapterTest() {
  console.log("=== 6F.3 TRACKING ADAPTER RUNTIME TEST ===");

  try {
    const update = createRiderTrackingUpdate({
      riderId: "R004",
      location: {
        latitude: 9.0567,
        longitude: 7.4969,
      },
      speedKmh: 30,
      heading: 90,
      accuracyMeters: 10,
    });

    assert(
      update.riderId === "R004",
      "Rider ID mismatch."
    );

    assert(
      update.location.latitude === 9.0567,
      "Latitude mismatch."
    );

    assert(
      update.location.longitude === 7.4969,
      "Longitude mismatch."
    );

    assert(
      update.speedKmh === 30,
      "Speed mismatch."
    );

    assert(
      update.heading === 90,
      "Heading mismatch."
    );

    assert(
      update.accuracyMeters === 10,
      "Accuracy mismatch."
    );

    assert(
      typeof update.timestamp === "string" &&
      update.timestamp.length > 0,
      "Timestamp missing."
    );

    console.log("VALID TRACKING UPDATE PASSED");
    console.log("Rider ID:", update.riderId);
    console.log("Latitude:", update.location.latitude);
    console.log("Longitude:", update.location.longitude);
    console.log("Timestamp:", update.timestamp);
  } catch (error) {
    console.error("VALID TRACKING UPDATE FAILED");
    console.error(error);
    throw error;
  }

  try {
    createRiderTrackingUpdate({
      riderId: "",
      location: {
        latitude: 9.0567,
        longitude: 7.4969,
      },
    });

    throw new Error(
      "Invalid tracking update was incorrectly accepted."
    );
  } catch (error) {
    console.log("INVALID TRACKING UPDATE REJECTED");
    console.log("Error:", error);
  }

  console.log("=== 6F.3 TEST PASSED ===");
}

runTrackingAdapterTest();
