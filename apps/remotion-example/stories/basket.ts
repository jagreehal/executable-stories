export interface Basket {
  items: { sku: string; price: number }[];
  code?: string;
  total: number;
}

const codes: Record<string, number> = { SAVE10: 0.1 };

const totalOf = (items: Basket['items'], code?: string) =>
  items.reduce((n, i) => n + i.price, 0) *
  (1 - (code ? (codes[code] ?? 0) : 0));

export const emptyBasket = (): Basket => ({ items: [], total: 0 });

export const addItem = (
  basket: Basket,
  item: Basket['items'][number],
): Basket => {
  const items = [...basket.items, item];

  return { ...basket, items, total: totalOf(items, basket.code) };
};

export const applyCode = (basket: Basket, code: string): Basket =>
  code in codes
    ? { ...basket, code, total: totalOf(basket.items, code) }
    : basket;
