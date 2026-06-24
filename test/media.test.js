const { describe, it } = require('node:test');
const assert = require('node:assert');
const { collectThreadMedia } = require('../src/media');

function createMessageCollection(items) {
    return {
        values: () => items[Symbol.iterator](),
        last: () => items[items.length - 1],
        size: items.length,
    };
}

function createPaginatedMessageFetcher(pages) {
    let callIndex = 0;
    return async () => createMessageCollection(pages[callIndex++] || []);
}

describe('collectThreadMedia', () => {
    it('skips the starter post and collects media from replies', async () => {
        const thread = {
            id: 'starter-msg',
            messages: {
                fetch: createPaginatedMessageFetcher([
                    [
                        {
                            id: 'starter-msg',
                            url: 'starter-url',
                            attachments: [{ contentType: 'image/png', url: 'img-starter' }],
                        },
                        {
                            id: 'reply-1',
                            url: 'reply-url',
                            attachments: [{ contentType: 'image/png', url: 'img-reply' }],
                        },
                    ],
                ]),
            },
        };

        const media = await collectThreadMedia(thread);
        assert.strictEqual(media.length, 1);
        assert.strictEqual(media[0].sourceMessageId, 'reply-1');
        assert.deepStrictEqual(media[0].mediaUrls, ['img-reply']);
    });

    it('returns an empty array when only the starter post has media', async () => {
        const thread = {
            id: 'starter-msg',
            messages: {
                fetch: createPaginatedMessageFetcher([
                    [
                        {
                            id: 'starter-msg',
                            url: 'starter-url',
                            attachments: [{ contentType: 'image/png', url: 'img-starter' }],
                        },
                    ],
                ]),
            },
        };

        const media = await collectThreadMedia(thread);
        assert.strictEqual(media.length, 0);
    });

    it('collects media from multiple replies', async () => {
        const thread = {
            id: 'starter-msg',
            messages: {
                fetch: createPaginatedMessageFetcher([
                    [
                        { id: 'reply-2', url: 'url-2', attachments: [{ contentType: 'image/png', url: 'img-2' }] },
                        { id: 'reply-1', url: 'url-1', attachments: [{ contentType: 'video/mp4', url: 'vid-1' }] },
                        {
                            id: 'starter-msg',
                            url: 'starter-url',
                            attachments: [{ contentType: 'image/png', url: 'img-starter' }],
                        },
                    ],
                ]),
            },
        };

        const media = await collectThreadMedia(thread);
        assert.strictEqual(media.length, 2);
        assert.deepStrictEqual(media[0].mediaUrls, ['vid-1']);
        assert.deepStrictEqual(media[1].mediaUrls, ['img-2']);
    });
});
