import { IconType } from "./type";

export const PinIcon: IconType = function (props) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      {...props}
    >
      <circle r="4" cx="8" cy="6" />
      <path d="M4 7 L8 13 L12 7 Z" />
      <circle r="2" cx="8" cy="6" fill="white" />
    </svg>
  );
};
