import { story } from 'executable-stories-vitest';
import { describe, expect, it } from 'vitest';
import { addItem, applyCode, emptyBasket } from './basket.js';

describe('Checkout', () => {
  it('Apply a discount code', ({ task }) => {
    story.init(task);

    story.given('a basket with a £50 jacket');
    let basket = addItem(emptyBasket(), { sku: 'jacket', price: 50 });
    story.state({ label: 'Basket', value: basket });

    story.when('the customer adds a £30 scarf');
    basket = addItem(basket, { sku: 'scarf', price: 30 });
    story.state({ label: 'Basket', value: basket });

    story.and('enters the code SAVE10');
    basket = applyCode(basket, 'SAVE10');

    story.then('the total drops by 10%');
    expect(basket.total).toBe(72);
    story.state({ label: 'Basket', value: basket });
  });
});
