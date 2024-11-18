import { useCallback, useRef, useState } from "react"

import { RideStatus } from "~/apiClient/apiSchemas"
import { LocationButton } from "~/components/modules/location-button/location-button"
import { Map } from "~/components/modules/map/map"
import { Avatar } from "~/components/primitives/avatar/avatar"
import { Button } from "~/components/primitives/button/button"
import { Modal } from "~/components/primitives/modal/modal"
import { Chair } from "~/contexts/simulator-context"
import { Coordinate } from "~/types"

type Props = {
  chair: Chair
}

function Statuses({ currentStatus }: {
  currentStatus: RideStatus
}) {
  const labelByStatus: Record<RideStatus, [label: string, colorClass: string]> = {
    MATCHING: ["空車", "text-sky-600"],
    ENROUTE: ["迎車", "text-amber-600"],
    PICKUP: ["乗車待ち", "text-amber-600"],
    CARRYING: ["賃走", "text-red-600"],
    ARRIVED: ["到着", "text-green-600"],
    COMPLETED: ["完了", "text-green-600"],
  }
  
  const [label, colorClass] = labelByStatus[currentStatus];
  return (
    <div className="text-xs my-2">
      <span className={`mr-2 ${colorClass}`}>●</span>
      <span className={`font-bold ${colorClass}`}>{label}</span>
    </div>
  )
}

function CoordinatePickup(
  props: {
    location: ReturnType<typeof useState<Coordinate>>
  }
) {
  const [ location, setLocation ] = props.location;
  const [ currentLocation, setCurrentLocation ] = useState<Coordinate>();

  const [ visibleModal, setVisibleModal ] = useState<boolean>(false);
  const modalRef = useRef<HTMLElement & { close: () => void }>(null);
  
  const handleCloseModal = useCallback(() => {
    setLocation(currentLocation)
    modalRef.current?.close()
    setVisibleModal(false)
  }, [setLocation, currentLocation])

  return (
    <>
      <LocationButton
        className="w-full"
        location={location}
        label="現在位置"
        onClick={() => setVisibleModal(true)}
      />
      {visibleModal && (
        <Modal
          ref={modalRef}
          onClose={handleCloseModal}
        >
          <div className="w-full h-full flex flex-col items-center">
            <Map
              className="max-h-[80%]"
              initialCoordinate={location}
              from={location}
              onMove={(c) => setCurrentLocation(c)}
              selectable
            />
            <Button className="w-full my-6" onClick={handleCloseModal} variant="primary">
              この座標で確定する
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}

export function ChairInfo(props: Props) {
  const location = useState<Coordinate>();
  
  return (
    <div 
      className="
        border-t
        flex
      "
    >
      <Avatar className="mx-3 my-auto"/>
      <div className="m-3 flex-grow">
        <div className="font-bold">
          <span>{props.chair.name}</span>
          <span className="ml-1 text-xs font-normal text-neutral-500">{props.chair.model}</span>
        </div>
        <Statuses currentStatus={props.chair.status} />
        <CoordinatePickup location={location}/>
      </div>
    </div>
  )
}
