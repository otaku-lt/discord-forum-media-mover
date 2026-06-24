const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    isMediaAttachment,
    isSinglePostThread,
    extractEventDate,
    isFutureEvent,
    ThreadFilter,
    sortByEventDate,
} = require('../src/filters');

describe('isMediaAttachment', () => {
    it('returns true for images', () => {
        assert.strictEqual(isMediaAttachment({ contentType: 'image/png' }), true);
    });

    it('returns true for videos', () => {
        assert.strictEqual(isMediaAttachment({ contentType: 'video/mp4' }), true);
    });

    it('returns false for non-media attachments', () => {
        assert.strictEqual(isMediaAttachment({ contentType: 'application/pdf' }), false);
    });

    it('returns false when contentType is missing', () => {
        assert.strictEqual(isMediaAttachment({}), false);
    });
});

describe('isSinglePostThread', () => {
    it('returns true for a thread with one message', async () => {
        const thread = {
            messages: {
                fetch: async () => new Map([['msg-1', {}]]),
            },
        };
        assert.strictEqual(await isSinglePostThread(thread), true);
    });

    it('returns false for a thread with more than one message', async () => {
        const thread = {
            messages: {
                fetch: async () => new Map([
                    ['msg-1', {}],
                    ['msg-2', {}],
                ]),
            },
        };
        assert.strictEqual(await isSinglePostThread(thread), false);
    });

    it('returns true even when the starter message contains media', async () => {
        const thread = {
            name: 'Media-only starter thread',
            messages: {
                fetch: async () => new Map([['msg-1', { attachments: [{ contentType: 'image/png' }] }]]),
            },
        };
        assert.strictEqual(await isSinglePostThread(thread), true);
    });
});

describe('extractEventDate', () => {
    it('parses ISO dates from the thread name', () => {
        const date = extractEventDate('2025-01-15 Some Event');
        assert.ok(date instanceof Date);
        assert.strictEqual(date.toISOString().startsWith('2025-01-15'), true);
    });

    it('parses European dates from the thread name', () => {
        const date = extractEventDate('Some Event 15.02.2025');
        assert.ok(date instanceof Date);
        assert.strictEqual(date.toISOString().startsWith('2025-02-15'), true);
    });

    it('returns null when no date is found', () => {
        assert.strictEqual(extractEventDate('No Date Here'), null);
    });
});

describe('isFutureEvent', () => {
    it('returns true for dates in the future', () => {
        const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);
        const thread = {
            name: `${farFuture.toISOString().split('T')[0]} Future Event`,
        };
        assert.strictEqual(isFutureEvent(thread), true);
    });

    it('returns false for dates in the past', () => {
        const thread = { name: '2000-01-01 Old Event' };
        assert.strictEqual(isFutureEvent(thread), false);
    });
});

describe('ThreadFilter', () => {
    it('skips excluded threads', async () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set(['123']) });
        const thread = { id: '123', name: 'Event' };
        assert.strictEqual(await filter.shouldSkip(thread), 'excluded');
    });

    it('skips single-post threads', async () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set() });
        const thread = {
            id: '789',
            name: 'Event',
            messages: { fetch: async () => new Map([['msg-1', {}]]) },
        };
        assert.strictEqual(await filter.shouldSkip(thread), 'single post');
    });

    it('returns null for threads that should be processed', async () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set() });
        const thread = {
            id: '000',
            name: '2000-01-01 Event',
            messages: { fetch: async () => new Map([['msg-1', {}], ['msg-2', {}]]) },
        };
        assert.strictEqual(await filter.shouldSkip(thread), null);
    });
});

describe('sortByEventDate', () => {
    it('sorts threads chronologically by event date', () => {
        const threads = [
            { name: '2025-03-01 Event C' },
            { name: '2025-01-01 Event A' },
            { name: '2025-02-01 Event B' },
        ];
        const sorted = sortByEventDate(threads);
        assert.deepStrictEqual(sorted.map(t => t.name), [
            '2025-01-01 Event A',
            '2025-02-01 Event B',
            '2025-03-01 Event C',
        ]);
    });

    it('places threads without a date after dated threads', () => {
        const threads = [
            { name: 'No Date Here' },
            { name: '2025-01-01 Event' },
        ];
        const sorted = sortByEventDate(threads);
        assert.deepStrictEqual(sorted.map(t => t.name), [
            '2025-01-01 Event',
            'No Date Here',
        ]);
    });

    it('sorts threads without a date alphabetically', () => {
        const threads = [
            { name: 'Beta' },
            { name: 'Alpha' },
        ];
        const sorted = sortByEventDate(threads);
        assert.deepStrictEqual(sorted.map(t => t.name), ['Alpha', 'Beta']);
    });

    it('does not mutate the original array', () => {
        const threads = [
            { name: '2025-02-01 Event' },
            { name: '2025-01-01 Event' },
        ];
        sortByEventDate(threads);
        assert.strictEqual(threads[0].name, '2025-02-01 Event');
    });
});
