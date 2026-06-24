const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');

describe('loadConfig', () => {
    it('throws when required variables are missing', () => {
        assert.throws(() => loadConfig({}), /Missing required environment variables/);
    });

    it('loads configuration from environment variables', () => {
        const config = loadConfig({
            DISCORD_TOKEN: 'token',
            SOURCE_FORUM_ID: 'forum',
            DESTINATION_CHANNEL_ID: 'channel',
            EXCLUDED_THREAD_IDS: 'a, b, c',
            PROCESSED_THREADS_FILE: './custom.yml',
        });

        assert.strictEqual(config.discordToken, 'token');
        assert.strictEqual(config.sourceForumId, 'forum');
        assert.strictEqual(config.destinationChannelId, 'channel');
        assert.deepStrictEqual(config.excludedThreadIds, new Set(['a', 'b', 'c']));
        assert.strictEqual(config.processedThreadsFile, './custom.yml');
    });

    it('uses defaults for optional variables', () => {
        const config = loadConfig({
            DISCORD_TOKEN: 'token',
            SOURCE_FORUM_ID: 'forum',
            DESTINATION_CHANNEL_ID: 'channel',
        });

        assert.deepStrictEqual(config.excludedThreadIds, new Set());
        assert.strictEqual(config.processedThreadsFile, './processed-threads.yml');
    });
});
