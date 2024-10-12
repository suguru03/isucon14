import { useEffect } from "react";
import { fetchChairPostCoordinate } from "~/apiClient/apiComponents";
import { Coordinate } from "~/apiClient/apiSchemas";
import { useClientChairRequestContext } from "~/contexts/driver-context";

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

export const useEmulator = () => {
  const clientChair = useClientChairRequestContext();

  useEffect(() => {
    if (
      !(
        clientChair.chair?.currentCoordinate &&
        clientChair.auth?.accessToken &&
        clientChair.payload?.coordinate &&
        clientChair.chair.currentCoordinate.location
      )
    ) {
      return;
    }

    const { location, setter } = clientChair.chair.currentCoordinate;
    const { pickup, destination } = clientChair.payload.coordinate;
    const accessToken = clientChair.auth.accessToken;
    const status = clientChair.status;

    const currentCoodinatePost = () => {
      if (location) {
        sessionStorage.setItem("latitude", String(location.latitude));
        sessionStorage.setItem("longitude", String(location.longitude));
        fetchChairPostCoordinate({
          body: location,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).catch((e) => {
          console.error(`CONSOLE ERROR: ${e}`);
        });
      }
    };

    const timeoutId = setTimeout(() => {
      currentCoodinatePost();

      switch (status) {
        case "DISPATCHING":
          if (pickup) {
            setter(move(location, pickup));
          }
          break;
        case "CARRYING":
          if (destination) {
            setter(move(location, destination));
          }
          break;
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [clientChair]);
};
