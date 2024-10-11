import type { SVGProps } from "react";

type AccessToken = string;

export type User = {
  id: string;
  name: string;
  accessToken: AccessToken;
};

export type IconType<P = SVGProps<SVGSVGElement>> = (
  props: P & SVGProps<SVGSVGElement>,
) => JSX.Element;

export type Coordinate = {
  lat: number;
  lon: number;
};
