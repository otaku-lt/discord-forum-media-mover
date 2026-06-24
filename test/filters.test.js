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
    it('returns true for a thread with one message', () => {
        assert.strictEqual(isSinglePostThread({ messageCount: 1 }), true);
    });

    it('returns false for a thread with more than one message', () => {
        assert.strictEqual(isSinglePostThread({ messageCount: 5 }), false);
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
    it('skips excluded threads', () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set(['123']) });
        const state = { has: () => false };
        const thread = { id: '123', name: 'Event', messageCount: 5 };
        assert.strictEqual(filter.shouldSkip(thread, state), 'excluded');
    });

    it('skips already processed threads', () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set() });
        const state = { has: id => id === '456' };
        const thread = { id: '456', name: 'Event', messageCount: 5 };
        assert.strictEqual(filter.shouldSkip(thread, state), 'already processed');
    });

    it('skips single-post threads', () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set() });
        const state = { has: () => false };
        const thread = { id: '789', name: 'Event', messageCount: 1 };
        assert.strictEqual(filter.shouldSkip(thread, state), 'single post');
    });

    it('returns null for threads that should be processed', () => {
        const filter = new ThreadFilter({ excludedThreadIds: new Set() });
        const state = { has: () => false };
        const thread = { id: '000', name: '2000-01-01 Event', messageCount: 5 };
        assert.strictEqual(filter.shouldSkip(thread, state), null);
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
