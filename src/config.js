const REQUIRED_CONFIG_KEYS = ['discordToken', 'sourceForumId', 'destinationChannelId'];

function parseSet(value) {
    return new Set(
        (value || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
    );
}

function loadConfig(env = process.env) {
    const config = {
        discordToken: env.DISCORD_TOKEN,
        sourceForumId: env.SOURCE_FORUM_ID,
        destinationChannelId: env.DESTINATION_CHANNEL_ID,
        excludedThreadIds: parseSet(env.EXCLUDED_THREAD_IDS),
        processedThreadsFile: env.PROCESSED_THREADS_FILE || './processed-threads.yml',
    };

    const missing = REQUIRED_CONFIG_KEYS.filter(key => !config[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return config;
}

module.exports = { loadConfig };
