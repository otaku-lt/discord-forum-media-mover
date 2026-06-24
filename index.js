try {
    process.loadEnvFile();
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}

const { ChannelType } = require('discord.js');
const { createClient } = require('./src/discord');
const { loadConfig } = require('./src/config');
const { ProcessedThreadsState } = require('./src/state');
const { ThreadFilter, sortByEventDate } = require('./src/filters');
const { collectThreadMedia, postMediaToThread } = require('./src/media');

async function fetchAllThreads(forum) {
    const threads = [...forum.threads.cache.values()];
    let archived = await forum.threads.fetchArchived();
    threads.push(...archived.threads.values());

    while (archived.hasMore) {
        const lastId = archived.threads.last().id;
        archived = await forum.threads.fetchArchived({ before: lastId });
        threads.push(...archived.threads.values());
    }

    return threads;
}

async function createDestinationThread(destination, sourceThread) {
    const starter = await destination.send({ content: sourceThread.name });
    return starter.startThread({ name: sourceThread.name });
}

async function processThread(sourceThread, destination, filter, state) {
    const skipReason = filter.shouldSkip(sourceThread, state);
    if (skipReason) {
        console.log(`Skipping "${sourceThread.name}": ${skipReason}`);
        return false;
    }

    const mediaByMessage = await collectThreadMedia(sourceThread);
    if (mediaByMessage.length === 0) {
        console.log(`No media in "${sourceThread.name}", marking as processed`);
        state.mark(sourceThread.id);
        return false;
    }

    const destinationThread = await createDestinationThread(destination, sourceThread);
    console.log(`Created thread: ${destinationThread.name}`);

    await postMediaToThread(destinationThread, mediaByMessage);
    state.mark(sourceThread.id);
    return true;
}

async function main() {
    const config = loadConfig();
    const state = new ProcessedThreadsState(config.processedThreadsFile);
    const filter = new ThreadFilter(config);
    const client = createClient();

    try {
        await client.login(config.discordToken);
        await new Promise(resolve => client.once('ready', resolve));

        const forum = await client.channels.fetch(config.sourceForumId);
        if (forum.type !== ChannelType.GuildForum) {
            throw new Error('Source channel is not a forum channel');
        }

        const destination = await client.channels.fetch(config.destinationChannelId);
        const allThreads = sortByEventDate(await fetchAllThreads(forum));

        console.log(`Found ${allThreads.length} total threads`);

        let processed = 0;
        let skipped = 0;
        let failed = 0;

        for (const thread of allThreads) {
            try {
                const created = await processThread(thread, destination, filter, state);
                if (created) processed++;
                else skipped++;
            } catch (error) {
                console.error(`Failed to process "${thread.name}":`, error);
                failed++;
            }
        }

        console.log(`Finished: ${processed} processed, ${skipped} skipped, ${failed} failed`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exitCode = 1;
    } finally {
        await client.destroy();
    }
}

main();
