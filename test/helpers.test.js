const { describe, it } = require('node:test');
const assert = require('node:assert');
const { chunkStrings } = require('../src/helpers');

describe('chunkStrings', () => {
    it('returns an empty array for empty input', () => {
        assert.deepStrictEqual(chunkStrings([]), []);
    });

    it('prefixes only the first chunk', () => {
        const result = chunkStrings(['a', 'b'], 9, 'prefix: ');
        assert.strictEqual(result[0], 'prefix: a');
        assert.strictEqual(result[1], 'b');
    });

    it('splits when adding the next string would exceed maxLength', () => {
        const result = chunkStrings(['hello', 'world'], 10);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0], 'hello');
        assert.strictEqual(result[1], 'world');
    });

    it('joins strings with newlines when they fit', () => {
        const result = chunkStrings(['a', 'b', 'c'], 100);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0], 'a\nb\nc');
    });
});
