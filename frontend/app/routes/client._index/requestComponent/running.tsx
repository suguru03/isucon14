import { Coordinate } from "~/apiClient/apiSchemas";
import { CoordinateText } from "~/components/primitives/coordinate/coordinate";
import { Text } from "~/components/primitives/text/text";
import type { RequestProps } from "~/components/request/type";

export const Running = ({
  message,
  destinationCoordinate,
}: RequestProps<
  "DISPATCHED" | "CARRYING",
  { message: string; destinationCoordinate?: Coordinate }
>) => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <Text>{message}</Text>
      {destinationCoordinate && (
        <CoordinateText value={destinationCoordinate} />
      )}
    </div>
  );
};
