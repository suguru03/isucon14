import type { RequestProps } from "./type";

export const Running = ({
  status
}: RequestProps< "DISPATCHED" | "CARRYING">) => {
  switch(status){
    case 'CARRYING':
      return <div>快適なドライビングをお楽しみください</div>
    case 'DISPATCHED':
      return  <div>車両が到着しました</div>
  }
};
