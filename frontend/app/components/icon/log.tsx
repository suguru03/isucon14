import type { ComponentProps, FC } from "react";

export const LogIcon: FC<ComponentProps<"svg">> = function (props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 281" {...props}>
      <path
        d="M71.5 7.5 59.66 53.45c-.05.12.09.23.19.16 19.38-13.31 42.85-21.1 68.14-21.1 70.11 0 126.23 59.87 120.03 131.28-5.03 57.88-51.37 104.22-109.25 109.25C67.37 279.23 7.5 223.11 7.5 153m52-99.5 37 23m48 29-16 49m27 69-27-69"
        fill="none"
        stroke="#000"
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="15px"
      />
    </svg>
  );
};
