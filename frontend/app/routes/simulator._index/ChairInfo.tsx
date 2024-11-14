import { Avatar } from "~/components/primitives/avatar/avatar"
import { Button } from "~/components/primitives/button/button"
import { Chair, ChairStatus } from "~/contexts/simulator-context"

type Props = {
  chair: Chair
}

function Statuses({ currentStatus }: {
  currentStatus: ChairStatus
}) {
  const labelByStatus: Record<ChairStatus, [label: string, colorClass: string]> = {
    NOT_ACTIVATE: ["サービス停止中", "text-neutral-400"],
    MATCHING: ["空車", "text-sky-600"],
    ENROUTE: ["迎車", "text-amber-600"],
    PICKUP: ["乗車待ち", "text-amber-600"],
    CARRYING: ["賃走", "text-red-600"],
    ARRIVED: ["到着", "text-grenn-600"],
    COMPLETED: ["完了", "text-grenn-600"],
  }
  
  const [label, colorClass] = labelByStatus[currentStatus];
  return (
    <div className="text-xs my-2">
      <span className={`mr-2 ${colorClass}`}>●</span>
      <span className={`font-bold ${colorClass}`}>{label}</span>
    </div>
  )
}

export function ChairInfo(props: Props) {
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
        <Button className="m-0 w-full py-1 px-2" variant="primary">位置を設定</Button>
      </div>
    </div>
  )
}
