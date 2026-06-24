const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
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
        assert.deepStrictEqual(state.threads, {});
    });

    it('migrates the legacy flat array format', () => {
        fs.writeFileSync(TEST_FILE, yaml.dump({ threads: ['old-1', 'old-2'] }));
        const state = new ProcessedThreadsState(TEST_FILE);
        assert.deepStrictEqual(state.threads, {
            'old-1': { destinationThreadId: null, postedMessageIds: [] },
            'old-2': { destinationThreadId: null, postedMessageIds: [] },
        });
    });

    it('tracks posted messages and destination thread IDs', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        state.markPostedMessage('thread-1', 'msg-1', 'dest-1');
        state.markPostedMessage('thread-1', 'msg-2', 'dest-1');

        assert.strictEqual(state.hasPostedMessage('thread-1', 'msg-1'), true);
        assert.strictEqual(state.hasPostedMessage('thread-1', 'msg-3'), false);
        assert.strictEqual(state.getThreadState('thread-1').destinationThreadId, 'dest-1');
    });

    it('does not duplicate posted message IDs', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        state.markPostedMessage('thread-1', 'msg-1', 'dest-1');
        state.markPostedMessage('thread-1', 'msg-1', 'dest-1');
        assert.deepStrictEqual(state.getThreadState('thread-1').postedMessageIds, ['msg-1']);
    });

    it('persists state across instances', () => {
        const first = new ProcessedThreadsState(TEST_FILE);
        first.markPostedMessage('thread-1', 'msg-1', 'dest-1');

        const second = new ProcessedThreadsState(TEST_FILE);
        assert.strictEqual(second.hasPostedMessage('thread-1', 'msg-1'), true);
        assert.strictEqual(second.getThreadState('thread-1').destinationThreadId, 'dest-1');
    });

    it('resets a thread state', () => {
        const state = new ProcessedThreadsState(TEST_FILE);
        state.markPostedMessage('thread-1', 'msg-1', 'dest-1');
        state.resetThread('thread-1');

        const threadState = state.getThreadState('thread-1');
        assert.strictEqual(threadState.destinationThreadId, null);
        assert.deepStrictEqual(threadState.postedMessageIds, []);
    });
});
