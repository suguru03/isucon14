import { useEffect, useRef } from "react";
import {
  fetchChairPostCoordinate,
  fetchChairPostRideStatus,
} from "~/api/api-components";
import { Coordinate } from "~/api/api-schemas";
import { useSimulatorContext } from "~/contexts/simulator-context";
import {
  setSimulatorCurrentCoordinate,
  setSimulatorCurrentRideId,
  setSimulatorStartCoordinate,
} from "~/utils/storage";

const move = (
  currentCoordinate: Coordinate,
  targetCoordinate: Coordinate,
): Coordinate => {
  switch (true) {
    case currentCoordinate.latitude !== targetCoordinate.latitude: {
      const sign =
        targetCoordinate.latitude - currentCoordinate.latitude > 0 ? 1 : -1;
      return {
        latitude: currentCoordinate.latitude + sign * 1,
        longitude: currentCoordinate.longitude,
      };
    }
    case currentCoordinate.longitude !== targetCoordinate.longitude: {
      const sign =
        targetCoordinate.longitude - currentCoordinate.longitude > 0 ? 1 : -1;
      return {
        latitude: currentCoordinate.latitude,
        longitude: currentCoordinate.longitude + sign * 1,
      };
    }
    default:
      throw Error("Error: Expected status to be 'Arraived'.");
  }
};

const currentCoodinatePost = (coordinate: Coordinate) => {
  setSimulatorCurrentCoordinate(coordinate);
  void fetchChairPostCoordinate({
    body: coordinate,
  }).catch((e) => console.error(e));
};

const postEnroute = (rideId: string, coordinate: Coordinate) => {
  setSimulatorStartCoordinate(coordinate);
  void fetchChairPostRideStatus({
    body: { status: "ENROUTE" },
    pathParams: {
      rideId,
    },
  }).catch((e) => console.error(e));
};

const postCarring = (rideId: string) => {
  void fetchChairPostRideStatus({
    body: { status: "CARRYING" },
    pathParams: {
      rideId,
    },
  }).catch((e) => console.error(e));
};

export const useEmulator = () => {
  const { chair, data, setCoordinate, isAnotherSimulatorBeingUsed, setClientRideId } = useSimulatorContext();
  const timeoutIdRef = useRef<ReturnType<(typeof setTimeout)>>()
  useEffect(() => {
    if (!isAnotherSimulatorBeingUsed) return () => {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = undefined;
    };
    if (timeoutIdRef.current === undefined) {
      console.log('current===undefined')
      timeoutIdRef.current = setTimeout(() => {
        const rideId = data?.ride_id;
        console.log('奪うよ', rideId, data?.status)
        switch(data?.status) {
          case "ENROUTE":
          case "PICKUP":
            setCoordinate?.(data?.pickup_coordinate)
            setClientRideId?.(rideId)
          break;
          case "CARRYING":
          case "ARRIVED":
            setCoordinate?.(data?.destination_coordinate)
            setClientRideId?.(rideId)
        }
      },60_000)
    }
  },[timeoutIdRef, isAnotherSimulatorBeingUsed, data])

  useEffect(() => {
    if (isAnotherSimulatorBeingUsed) return;
    if (!(chair && data)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      currentCoodinatePost(chair.coordinate);
      try {
        switch (data.status) {
          case "MATCHING":
            postEnroute(data.ride_id, chair.coordinate);
            break;
          case "PICKUP":
            postCarring(data.ride_id);
            break;
          case "ENROUTE":
            setCoordinate?.(move(chair.coordinate, data.pickup_coordinate));
            break;
          case "CARRYING":
            setCoordinate?.(
              move(chair.coordinate, data.destination_coordinate),
            );
            break;
        }
      } catch (e) {
        // statusの更新タイミングの都合で到着状態を期待しているが必ず取れるとは限らない
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [chair, data, setCoordinate, isAnotherSimulatorBeingUsed]);
};
