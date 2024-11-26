import type { MetaFunction } from "@remix-run/node";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import colors from "tailwindcss/colors";
import {
  fetchAppGetNearbyChairs,
  fetchAppPostRides,
  fetchAppPostRidesEstimatedFare,
} from "~/apiClient/apiComponents";
import { Coordinate, RideStatus } from "~/apiClient/apiSchemas";
import { useOnClickOutside } from "~/components/hooks/use-on-click-outside";
import { LocationButton } from "~/components/modules/location-button/location-button";
import { Map } from "~/components/modules/map/map";
import { PriceText } from "~/components/modules/price-text/price-text";
import { Button } from "~/components/primitives/button/button";
import { Modal } from "~/components/primitives/modal/modal";
import { Text } from "~/components/primitives/text/text";
import { useClientAppRequestContext } from "~/contexts/user-context";
import { NearByChair } from "~/types";
import { Arrived } from "./driving-state/arrived";
import { Carrying } from "./driving-state/carrying";
import { Dispatched } from "./driving-state/dispatched";
import { Enroute } from "./driving-state/enroute";
import { Matching } from "./driving-state/matching";

export const meta: MetaFunction = () => {
  return [
    { title: "Top | ISURIDE" },
    { name: "description", content: "目的地まで椅子で快適に移動しましょう" },
  ];
};

type LocationSelectTarget = "from" | "to";
type EstimatePrice = { fare: number; discount: number };

export default function Index() {
  const { status, payload: payload } = useClientAppRequestContext();
  // internalState: AppRequestContext.status をもとに決定する内部 status
  // 内部で setState をしたい要件があったので実装している
  const [internalStatus, setInternalStatus] = useState<RideStatus | undefined>(undefined);
  useEffect(() => {
    setInternalStatus(status);
  }, [status]);

  // requestId: リクエストID
  // TODO: requestId をベースに配車キャンセルしたい
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [requestId, setRequestId] = useState<string>("");
  // fare: 確定運賃
  const [fare, setFare] = useState<number>();

  // currentLocation：現在地
  const [currentLocation, setCurrentLocation] = useState<Coordinate>();
  // destLocation：目的地
  const [destLocation, setDestLocation] = useState<Coordinate>();

  // locationSelectTarget: 座標選択モーダルが「現在地」「目的地」どの座標を選択しているかどうか
  const [locationSelectTarget, setLocationSelectTarget] = useState<LocationSelectTarget | null>(null);
  // selectedLocation: 座標選択モーダルで選択している座標
  const [selectedLocation, setSelectedLocation] = useState<Coordinate>();
  // 座標選択時の処理
  const onMove = useCallback((coordinate: Coordinate) => {
    setSelectedLocation(coordinate);
  }, []);
  // isLocationSelectorModalOpen: 座標選択モーダルを表示するかどうか
  const isLocationSelectorModalOpen = useMemo(
    () => locationSelectTarget !== null,
    [locationSelectTarget]
  );
  // locationSelectorModalRef: 座標選択モーダルの Modal 要素への参照
  const locationSelectorModalRef = useRef<HTMLElement & { close: () => void }>(null);
  // handleCloseLocationSelectorModal: 座標選択モーダルを閉じるハンドラ
  const handleCloseLocationSelectorModal = useCallback(() => {
    // Modal を閉じるアニメーションをトリガーするため close() を呼ぶ
    if (locationSelectorModalRef.current) {
      locationSelectorModalRef.current.close();
    }
    // 少し時間をおいた後、Modal 要素を DOM から外す
    setTimeout(
      () => setLocationSelectTarget(null),
      300,
    );
  }, []);
  // 座標選択モーダルは、領域外をクリックしたときも閉じる処理をトリガーする
  useOnClickOutside(locationSelectorModalRef, handleCloseLocationSelectorModal);
  // handleConfirmLocation: 座標選択モーダルで選択された座標をセットする
  const handleConfirmLocation = useCallback(
    () => {
      // locationSelectTarget の値によってセットする先を変える
      if (locationSelectTarget === "from") {
        setCurrentLocation(selectedLocation);
      } else if (locationSelectTarget === "to") {
        setDestLocation(selectedLocation);
      }
      // セットし終わったらモーダルを閉じる
      handleCloseLocationSelectorModal();
    },
    [locationSelectTarget, selectedLocation, handleCloseLocationSelectorModal]
  )

  // isStatusModalOpen: 状態遷移に応じたモーダルを表示するかどうか
  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
  useEffect(() => {
    setStatusModalOpen(
      internalStatus !== undefined &&
      ["MATCHING", "ENROUTE", "PICKUP", "CARRYING", "ARRIVED"].includes(internalStatus)
    )
  }, [internalStatus]);

  // statusModalRef: 状態遷移に応じたモーダルの Modal 要素への参照
  const statusModalRef = useRef<HTMLElement & { close: () => void }>(null);
  // handleCloseStatusModal: 状態遷移に応じたモーダルを閉じるハンドラ
  const handleCloseStatusModal = useCallback(() => {
    // Modal を閉じるアニメーションをトリガーするため close() を呼ぶ
    if (statusModalRef.current) {
      statusModalRef.current.close();
    }
    // 少し時間をおいた後、Modal 要素を DOM から外す
    setTimeout(
      () => setStatusModalOpen(false),
      300,
    );
  }, []);

  // estimatePrice：推定運賃
  const [estimatePrice, setEstimatePrice] = useState<EstimatePrice>();
  // 現在地、目的地が確定したら API 問い合わせして推定運賃を算出する
  useEffect(() => {
    if (!currentLocation || !destLocation) {
      return;
    }
    const abortController = new AbortController();
    fetchAppPostRidesEstimatedFare(
      {
        body: {
          pickup_coordinate: currentLocation,
          destination_coordinate: destLocation,
        },
      },
      abortController.signal,
    )
      .then((res) =>
        setEstimatePrice({ fare: res.fare, discount: res.discount }),
      )
      .catch((err) => {
        console.error(err);
        setEstimatePrice(undefined);
      });
    return () => {
      abortController.abort();
    };
  }, [currentLocation, destLocation]);


  // 「ISURIDE」ボタンのハンドラ
  const handleRideRequest = useCallback(async () => {
    if (!currentLocation || !destLocation) {
      return;
    }
    setInternalStatus("MATCHING");
    await fetchAppPostRides({
      body: {
        pickup_coordinate: currentLocation,
        destination_coordinate: destLocation,
      },
    }).then((res) => {
      setRequestId(res.ride_id);
      setFare(res.fare);
    });
  }, [currentLocation, destLocation]);

  // 「現在地」が選択されたら、API 問い合わせして現在位置近傍の ISU 一覧を取得する
  // TODO: NearByChairのつなぎこみは後ほど行う
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nearByChairs, setNearByChairs] = useState<NearByChair[]>();
  useEffect(() => {
    if (!currentLocation) {
      return;
    }
    const abortController = new AbortController();
    void (async () => {
      try {
        const { chairs } = await fetchAppGetNearbyChairs(
          {
            queryParams: {
              latitude: currentLocation?.latitude,
              longitude: currentLocation?.longitude,
            },
          },
          abortController.signal,
        );
        setNearByChairs(chairs);
      } catch (error) {
        console.error(error);
      }
    })();
    return () => abortController.abort();
  }, [setNearByChairs, currentLocation]);

  // TODO: 以下は上記が正常に返ったあとに削除する
  // const [data, setData] = useState<NearByChair[]>([
  //   {
  //     id: "hoge",
  //     current_coordinate: { latitude: 100, longitude: 100 },
  //     model: "a",
  //     name: "hoge",
  //   },
  //   {
  //     id: "1",
  //     current_coordinate: { latitude: 20, longitude: 20 },
  //     model: "b",
  //     name: "hoge",
  //   },
  //   {
  //     id: "2",
  //     current_coordinate: { latitude: -100, longitude: -100 },
  //     model: "c",
  //     name: "hoge",
  //   },
  //   {
  //     id: "3",
  //     current_coordinate: { latitude: -160, longitude: -100 },
  //     model: "d",
  //     name: "hoge",
  //   },
  //   {
  //     id: "4",
  //     current_coordinate: { latitude: -10, longitude: 100 },
  //     model: "e",
  //     name: "hoge",
  //   },
  // ]);

  // useEffect(() => {
  //   const randomInt = (min: number, max: number) => {
  //     return Math.floor(Math.random() * (max - min + 1)) + min;
  //   };
  //   const update = () => {
  //     setData((data) =>
  //       data.map((chair) => ({
  //         ...chair,
  //         current_coordinate: {
  //           latitude: chair.current_coordinate.latitude + randomInt(-2, 2),
  //           longitude: chair.current_coordinate.longitude + randomInt(-2, 2),
  //         },
  //       })),
  //     );
  //     setTimeout(update, 1000);
  //   };
  //   update();
  // }, []);

  return (
    <>
      <Map
        from={currentLocation}
        to={destLocation}
        initialCoordinate={selectedLocation}
        chairs={nearByChairs}
      />
      <div className="w-full px-8 py-8 flex flex-col items-center justify-center">
        <LocationButton
          className="w-full"
          location={currentLocation}
          onClick={() => {
            setLocationSelectTarget("from");
          }}
          placeholder="現在地を選択する"
          label="現在地"
        />
        <Text size="xl">↓</Text>
        <LocationButton
          location={destLocation}
          className="w-full"
          onClick={() => {
            setLocationSelectTarget("to");
          }}
          placeholder="目的地を選択する"
          label="目的地"
        />
        {estimatePrice && (
          <div className="flex mt-4">
            <Text>推定運賃: </Text>
            <PriceText className="px-4" value={estimatePrice.fare} />
            <Text>(割引額: </Text>
            <PriceText value={estimatePrice.discount} />
            <Text>)</Text>
          </div>
        )}
        <Button
          variant="primary"
          className="w-full mt-6 font-bold"
          onClick={() => void handleRideRequest()}
          disabled={!(Boolean(currentLocation) && Boolean(destLocation))}
        >
          ISURIDE
        </Button>
      </div>
      {isLocationSelectorModalOpen && (
        <Modal ref={locationSelectorModalRef} onClose={handleCloseLocationSelectorModal}>
          <div className="flex flex-col items-center mt-4 h-full">
            <div className="flex-grow w-full max-h-[75%] mb-6">
              <Map
                onMove={onMove}
                from={currentLocation}
                to={destLocation}
                selectorPinColor={
                  locationSelectTarget === "from" ? colors.black : colors.red[500]
                }
                initialCoordinate={
                  locationSelectTarget === "from" ? currentLocation : destLocation
                }
                selectable
                className="rounded-2xl"
              />
            </div>
            <p className="font-bold mb-4 text-base">
              {locationSelectTarget === "from" ? "現在地" : "目的地"}を選択してください
            </p>
            <Button onClick={handleConfirmLocation}>
              {locationSelectTarget === "from"
                ? "この場所から移動する"
                : "この場所に移動する"}
            </Button>
          </div>
        </Modal>
      )}
      {isStatusModalOpen && (
        <Modal ref={statusModalRef}>
          {internalStatus === "MATCHING" && (
            <Matching
              destLocation={payload?.coordinate?.destination}
              pickup={payload?.coordinate?.pickup}
              fare={fare}
            />
          )}
          {internalStatus === "ENROUTE" && (
            <Enroute
              destLocation={payload?.coordinate?.destination}
              pickup={payload?.coordinate?.pickup}
            />
          )}
          {internalStatus === "PICKUP" && (
            <Dispatched
              destLocation={payload?.coordinate?.destination}
              pickup={payload?.coordinate?.pickup}
            />
          )}
          {internalStatus === "CARRYING" && (
            <Carrying
              destLocation={payload?.coordinate?.destination}
              pickup={payload?.coordinate?.pickup}
            />
          )}
          {internalStatus === "ARRIVED" && (
            <Arrived
              onEvaluated={handleCloseStatusModal}
            />
          )}
        </Modal>
      )}
    </>
  );
}
