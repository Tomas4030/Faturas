/** Fatura de exemplo da spec §7, usada com EXTRACTION_MODE=mock. */
export const MOCK_RECEIPT = {
  merchant: {
    name: 'Restaurante Sakura',
    nif: '123456789',
    address: 'Rua Exemplo 12, Faro',
  },
  document: {
    type: 'receipt',
    date: '2026-06-10',
    number: 'FT 2026/123',
    atcud: 'ABCD123-456',
    currency: 'EUR',
  },
  items: [
    {
      description: 'Menu Sushi',
      quantity: 2,
      unit_price: 18.5,
      total: 37,
      category: 'restaurant_food',
      confidence: 0.94,
    },
    {
      description: 'Coca-Cola',
      quantity: 2,
      unit_price: 2.5,
      total: 5,
      category: 'drinks',
      confidence: 0.91,
    },
    {
      description: 'Sobremesa do dia',
      quantity: 1,
      unit_price: 4,
      total: 4,
      category: 'restaurant_food',
      confidence: 0.78,
    },
  ],
  taxes: [{ rate: 13, base: 41, amount: 5.33 }],
  totals: { subtotal: 46, tax: 0, discount: 0, tip: 0, grand_total: 46 },
  warnings: [],
};
