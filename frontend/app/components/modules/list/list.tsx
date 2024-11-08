import { PropsWithoutRef, ReactNode } from "react";

type ListProps<T> = PropsWithoutRef<{
  items: T[];
  keyFn: (item: T) => string;
  rowFn: (item: T) => ReactNode;
}>;

export function List<T>({ items, keyFn: key, rowFn: row }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={key(item)} className="px-4 py-3 border-b">
          {row(item)}
        </li>
      ))}
    </ul>
  );
}
