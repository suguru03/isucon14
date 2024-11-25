import { useEffect } from "react";
import { fetchChairPostCoordinate } from "~/apiClient/apiComponents";
import { Coordinate } from "~/apiClient/apiSchemas";
import { SimulatorChair, useSimulatorContext } from "~/contexts/simulator-context";

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
export const useEmulator = (targetChair: SimulatorChair) => {

  useEffect(() => {
    if (
      !(
        targetChair?.coordinateState?.coordinate &&
        targetChair?.chairNotification?.payload?.coordinate
      )
    ) {
      return;
    }

    const { coordinate, setter } = targetChair.coordinateState;
    const { pickup, destination } =
      targetChair.chairNotification.payload.coordinate;
    const status = targetChair.chairNotification.status;

    const currentCoodinatePost = () => {
      if (coordinate) {
        sessionStorage.setItem("latitude", String(coordinate.latitude));
        sessionStorage.setItem("longitude", String(coordinate.longitude));
        fetchChairPostCoordinate({
          body: coordinate,
        }).catch((e) => {
          console.error(`CONSOLE ERROR: ${e}`);
        });
      }
    };

    const timeoutId = setTimeout(() => {
      currentCoodinatePost();

      switch (status) {
        case "ENROUTE":
          if (pickup) {
            setter(move(coordinate, pickup));
          }
          break;
        case "CARRYING":
          if (destination) {
            setter(move(coordinate, destination));
          }
          break;
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [targetChair]);
};
