/* eslint-disable @typescript-eslint/no-explicit-any */

export const debounce = (
  n: number,
  fn: (...params: any[]) => void,
  immediate: boolean = false,
) => {
  let timer: ReturnType<typeof setTimeout> | undefined = undefined;
  return function (this: any, ...args: any[]) {
    if (timer === undefined && immediate) {
      fn.apply(this, args);
    }
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), n);
    return timer;
  };
};
