import { ComponentProps, FC, useMemo } from "react";
import { ChairGreenIcon } from "./chair-green";
import { ChairRedIcon } from "./chair-red";
import { ChairYellowIcon } from "./chair-yellow";

type Props = { model: string } & ComponentProps<"svg">;

const ChairTypes = ["green", "red", "yellow"] as const;

export const ChairIcon: FC<Props> = ({ model, ...props }) => {
  const chairType = useMemo(() => {
    return ChairTypes[model.charCodeAt(0) % ChairTypes.length];
  }, [model]);
  switch (chairType) {
    case "green":
      return <ChairGreenIcon width={40} height={40} {...props} />;
    case "yellow":
      return <ChairYellowIcon width={40} height={40} {...props} />;
    case "red":
      return <ChairRedIcon width={40} height={40} {...props} />;
  }
};
