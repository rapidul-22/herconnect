import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCart, removeOrderedItems } from '../client/src/cart.js';

test('multi-shop bag groups products and removes only purchased quantities', () => {
  const a = { _id: 'shop-a', shop: { name: 'Shop A' } };
  const b = { _id: 'shop-b', shop: { name: 'Shop B' } };
  const cart = [
    { _id: 'a1', seller: a, quantity: 3 },
    { _id: 'b1', seller: b, quantity: 1 },
    { _id: 'a2', seller: a, quantity: 2 },
  ];
  const groups = groupCart(cart);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items.map(i => i._id), ['a1', 'a2']);
  assert.deepEqual(removeOrderedItems(cart, [
    { product: 'a1', quantity: 2 }, { product: 'a2', quantity: 2 },
  ]).map(i => [i._id, i.quantity]), [['a1', 1], ['b1', 1]]);
  assert.equal(cart[0].quantity, 3, 'original bag must not be mutated');
  assert.deepEqual(groupCart([]), []);
  assert.deepEqual(removeOrderedItems(cart, []), cart);
});
