import type { RequestComponentProps } from "./type";

export const Running: RequestComponentProps<"DISPATCHED" | "CARRYING"> = ({
  status,
}) => {
  return (
    <>
      {status === "DISPATCHED" ? (
        <div>車両が到着しました</div>
      ) : (
        <div>快適なドライビングをお楽しみください</div>
      )}
    </>
  );
};
