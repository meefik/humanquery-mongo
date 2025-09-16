import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import convert from '../src/index.js';

suite('convert', () => {
  test('equals string', () => {
    const str = 'x = "text"';
    const json = '{"x":"text"}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals number', () => {
    const str = 'x = 1';
    const json = '{"x":1}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals boolean', () => {
    const str = 'x = true';
    const json = '{"x":true}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals null', () => {
    const str = 'x = null';
    const json = '{"x":null}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals array', () => {
    const str = 'x = [1, "text", null]';
    const json = '{"x":{"$in":[1,"text",null]}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals empty array', () => {
    const str = 'x = []';
    const json = '{"x":[]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals date', () => {
    const str = 'x = 2025-10-01';
    const json = '{"x":"2025-10-01T00:00:00.000Z"}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals regex', () => {
    const str = 'x ~ "text.*"';
    const json = '{"x":{"$regex":"text.*"}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals regex case-insensitive', () => {
    const str = 'x ~* "text.*"';
    const json = '{"x":{"$regex":"text.*","$options":"i"}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals quoted text', () => {
    const str = `x = 'hello world'`;
    const json = '{"x":"hello world"}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('equals double-quoted text', () => {
    const str = 'x = "hello world"';
    const json = '{"x":"hello world"}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('not equals', () => {
    const str = 'x != 1';
    const json = '{"x":{"$ne":1}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('greater than', () => {
    const str = 'x > 1';
    const json = '{"x":{"$gt":1}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('greater than or equal', () => {
    const str = 'x >= 1';
    const json = '{"x":{"$gte":1}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('less than', () => {
    const str = 'x < 1';
    const json = '{"x":{"$lt":1}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('less than or equal', () => {
    const str = 'x <= 1';
    const json = '{"x":{"$lte":1}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('strong equals', () => {
    const str = 'x == [1, null, "3"]';
    const json = '{"x":[1,null,"3"]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('strong not equals', () => {
    const str = 'x !== [1, null, "3"]';
    const json = '{"x":{"$ne":[1,null,"3"]}}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('AND operator', () => {
    const str = 'a = 1 & b = 2 & c = 3';
    const json = '{"$and":[{"a":1},{"b":2},{"c":3}]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('OR operator', () => {
    const str = 'a = 1 | b = 2 | c = 3';
    const json = '{"$or":[{"a":1},{"b":2},{"c":3}]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('AND and OR operators', () => {
    const str = 'a = 1 & b = 2 | c = 3 & d = 4';
    const json = '{"$or":[{"$and":[{"a":1},{"b":2}]},{"$and":[{"c":3},{"d":4}]}]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('OR and AND operators', () => {
    const str = 'a = 1 | b = 2 & c = 3 | d = 4';
    const json = '{"$or":[{"a":1},{"$and":[{"b":2},{"c":3}]},{"d":4}]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('grouping with parentheses', () => {
    const str = 'a = 1 & (b = 2 | c = 3) & d = 4';
    const json = '{"$and":[{"a":1},{"$or":[{"b":2},{"c":3}]},{"d":4}]}';
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });

  test('complex expression', () => {
    const str = `a.x1 > 0 & ( b >= 0 | (c !== true & d ~ 'a + b & c = 0' & f <= -1 | a ~* "hello" )) & e != 10 | g = [1,null,"text"] & n == [1,null,'text']`;
    const json = `{"$or":[{"$and":[{"a.x1":{"$gt":0}},{"$or":[{"b":{"$gte":0}},{"$or":[{"$and":[{"c":{"$ne":true}},{"d":{"$regex":"a + b & c = 0"}},{"f":{"$lte":-1}}]},{"a":{"$regex":"hello","$options":"i"}}]}]},{"e":{"$ne":10}}]},{"$and":[{"g":{"$in":[1,null,"text"]}},{"n":[1,null,"text"]}]}]}`;
    const query = convert(str);
    assert.deepEqual(JSON.stringify(query), json);
  });
});
