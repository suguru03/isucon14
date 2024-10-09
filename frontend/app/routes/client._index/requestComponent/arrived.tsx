import type { RequestComponentProps } from "./type";

export const Arrived: RequestComponentProps<"ARRIVED"> = ({ status }) => {
  return <div>目的地に到着しました 評価してください</div>;
};
