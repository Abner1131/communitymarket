import AsyncStorage from "@react-native-async-storage/async-storage";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


import { createRiderTrackingUpdate } from "../services/trackingAdapter";

import {
  getTrackingUpdates,
  saveTrackingUpdate,
} from "../services/trackingStorage";

import { riders as initialRiders } from "../data/riders";

import type {
  RiderLocation,
} from "../types/community";

import type { Rider } from "../services/dispatchEngine";

import {
  moveRiderToward,
  type GPSPoint,
} from "../services/riderSimulation";

type RiderContextType = {
  riders: Rider[];

  setRiderOnline: (
    riderId: string,
    isOnline: boolean
  ) => void;

  setRiderAvailable: (
    riderId: string,
    isAvailable: boolean
  ) => void;

  assignOrderToRider: (
    riderId: string,
    orderId: string
  ) => void;

  clearRiderOrder: (
    riderId: string
  ) => void;

  updateRiderLocation: (
    riderId: string,
    latitude: number,
    longitude: number
  ) => void;

  moveRiderTowardDestination: (
    riderId: string,
    destination: GPSPoint,
    stepKm?: number
  ) => void;

  getRiderById: (
    riderId: string
  ) => Rider | undefined;

  getRiderLocation: (
    riderId: string
  ) => RiderLocation | undefined;
};

const RiderContext =
  createContext<RiderContextType | undefined>(
    undefined
  );

const RIDER_STATE_STORAGE_KEY =
  "@communitymarket/rider-state";

export function RiderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [riders, setRiders] =
    useState<Rider[]>(
      initialRiders
    );

  const [isHydratingRiders, setIsHydratingRiders] =
    useState(true);

  const [riderLocations, setRiderLocations] =
    useState<Record<string, RiderLocation>>({});

  /*
   * RIDER STATE HYDRATION
   *
   * Current rider assignment/availability is operational state.
   * Keep it separate from historical order records.
   */
  useEffect(() => {
    let active = true;

    async function hydrateRiders() {
      try {
        const saved = await AsyncStorage.getItem(
          RIDER_STATE_STORAGE_KEY
        );

        if (!saved) {
          return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
          return;
        }

        setRiders((current) =>
          current.map((rider) => {
            const savedRider = parsed.find(
              (item) => item?.id === rider.id
            );

            if (!savedRider) {
              return rider;
            }

            return {
              ...rider,
              isOnline:
                typeof savedRider.isOnline === "boolean"
                  ? savedRider.isOnline
                  : rider.isOnline,
              isAvailable:
                typeof savedRider.isAvailable === "boolean"
                  ? savedRider.isAvailable
                  : rider.isAvailable,
              currentOrderId:
                savedRider.currentOrderId ?? undefined,
            };
          })
        );
      } catch (error) {
        console.warn(
          "RIDER STATE HYDRATION FAILED:",
          error
        );
      } finally {
        if (active) {
          setIsHydratingRiders(false);
        }
      }
    }

    void hydrateRiders();

    return () => {
      active = false;
    };
  }, []);

  /*
   * RIDER STATE PERSISTENCE
   */
  useEffect(() => {
    if (isHydratingRiders) {
      return;
    }

    void AsyncStorage.setItem(
      RIDER_STATE_STORAGE_KEY,
      JSON.stringify(
        riders.map((rider) => ({
          id: rider.id,
          isOnline: rider.isOnline,
          isAvailable: rider.isAvailable,
          currentOrderId: rider.currentOrderId,
        }))
      )
    ).catch((error) => {
      console.warn(
        "RIDER STATE PERSISTENCE FAILED:",
        error
      );
    });
  }, [riders, isHydratingRiders]);

  useEffect(() => {
    let active = true;

    void getTrackingUpdates()
      .then((updates) => {
        if (
          !active ||
          updates.length === 0
        ) {
          return;
        }

        const latestByRider: Record<
          string,
          RiderLocation
        > = {};

        for (const update of updates) {
          const existing =
            latestByRider[
              update.riderId
            ];

          if (
            !existing ||
            update.timestamp >=
              existing.timestamp
          ) {
            latestByRider[
              update.riderId
            ] = update;
          }
        }

        setRiderLocations(
          latestByRider
        );
      })
      .catch((error) => {
        console.warn(
          "TRACKING HYDRATION FAILED:",
          error
        );
      });

    return () => {
      active = false;
    };
  }, []);

  function setRiderOnline(
    riderId: string,
    isOnline: boolean
  ) {
    setRiders(
      (current) =>
        current.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                isOnline,
                isAvailable:
                  isOnline
                    ? rider.isAvailable
                    : false,
              }
            : rider
        )
    );
  }

  function setRiderAvailable(
    riderId: string,
    isAvailable: boolean
  ) {
    setRiders(
      (current) =>
        current.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                isAvailable:
                  rider.isOnline &&
                  !rider.currentOrderId
                    ? isAvailable
                    : false,
              }
            : rider
        )
    );
  }

  function assignOrderToRider(
    riderId: string,
    orderId: string
  ) {
    setRiders(
      (current) =>
        current.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                isAvailable: false,
                currentOrderId:
                  orderId,
              }
            : rider
        )
    );
  }

  function clearRiderOrder(
    riderId: string
  ) {
    setRiders(
      (current) =>
        current.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                currentOrderId:
                  undefined,
                isAvailable:
                  rider.isOnline,
              }
            : rider
        )
    );
  }

  function updateRiderLocation(
    riderId: string,
    latitude: number,
    longitude: number
  ) {
    const trackingUpdate =
      createRiderTrackingUpdate({
        riderId,
        location: {
          latitude,
          longitude,
        },
      });

    setRiderLocations(
      (current) => ({
        ...current,
        [riderId]:
          trackingUpdate,
      })
    );

    void saveTrackingUpdate(
      trackingUpdate
    );

    setRiders(
      (current) =>
        current.map((rider) =>
          rider.id === riderId
            ? {
                ...rider,
                latitude,
                longitude,
              }
            : rider
        )
    );
  }

  function moveRiderTowardDestination(
    riderId: string,
    destination: GPSPoint,
    stepKm: number = 0.5
  ) {
    const rider =
      riders.find(
        (currentRider) =>
          currentRider.id === riderId
      );

    if (!rider) {
      return;
    }

    const movedRider =
      moveRiderToward(
        rider,
        destination,
        stepKm
      );

    const trackingUpdate =
      createRiderTrackingUpdate({
        riderId,
        location: {
          latitude:
            movedRider.latitude,
          longitude:
            movedRider.longitude,
        },
      });

    setRiderLocations(
      (current) => ({
        ...current,
        [riderId]:
          trackingUpdate,
      })
    );

    void saveTrackingUpdate(
      trackingUpdate
    );

    setRiders(
      (current) =>
        current.map(
          (currentRider) =>
            currentRider.id ===
            riderId
              ? movedRider
              : currentRider
        )
    );
  }

  function getRiderById(
    riderId: string
  ) {
    return riders.find(
      (rider) =>
        rider.id === riderId
    );
  }

  function getRiderLocation(
    riderId: string
  ) {
    return riderLocations[
      riderId
    ];
  }

  const value = useMemo(
    () => ({
      riders,
      setRiderOnline,
      setRiderAvailable,
      assignOrderToRider,
      clearRiderOrder,
      updateRiderLocation,
      moveRiderTowardDestination,
      getRiderLocation,
      getRiderById,
    }),
    [
      riders,
      riderLocations,
    ]
  );

  return (
    <RiderContext.Provider
      value={value}
    >
      {children}
    </RiderContext.Provider>
  );
}

export function useRiders() {
  const context =
    useContext(RiderContext);

  if (!context) {
    throw new Error(
      "useRiders must be used inside RiderProvider"
    );
  }

  return context;
}
