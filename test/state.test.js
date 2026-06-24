const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ProcessedThreadsState } = require('../src/state');

const TEST_FILE = path.join(__dirname, 'processed-threads-test.yml');

describe('ProcessedThreadsState', () => {
    beforeEach(() => {
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    });

    it('starts empty when the file does not exist', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        assert.strictEqual(state.has('123'), false);
    });

    it('marks a thread as processed and persists it', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        state.mark('123');
        assert.strictEqual(state.has('123'), true);

        const reloaded = new ProcessedThreadsState(TEST_FILE);
        assert.strictEqual(reloaded.has('123'), true);
    });

    it('does not duplicate entries when marking the same thread twice', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        state.mark('123');
        state.mark('123');
        assert.strictEqual(state.processedIds.size, 1);
    });
});
