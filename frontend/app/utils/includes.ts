export function isArrayIncludes<T extends unknown[]>(
  array: T,
  value: unknown,
): value is T extends (infer U)[] ? U : unknown {
  return array.includes(value);
}
