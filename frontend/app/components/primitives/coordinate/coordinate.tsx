import { FC } from "react";
import { Coordinate } from "~/apiClient/apiSchemas";
import { PinIcon } from "~/components/icon/pin";

type CoordinateTextProps = {
  value: Coordinate;
};

export const CoordinateText: FC<CoordinateTextProps> = ({ value }) => {
  const text = `[${value.latitude}, ${value.longitude}]`;
  return (
    <span className="flex items-center gap-1">
      <PinIcon className="size-[36px]" />
      {text}
    </span>
  );
};
