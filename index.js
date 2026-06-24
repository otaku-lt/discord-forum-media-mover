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

async function findDestinationThreadByName(destination, sourceThread) {
    const active = await destination.threads.fetchActive();
    let match = [...active.threads.values()].find(t => t.name === sourceThread.name);
    if (match) return match;

    const archived = await destination.threads.fetchArchived();
    match = [...archived.threads.values()].find(t => t.name === sourceThread.name);
    if (match) return match;

    return null;
}

async function getOrCreateDestinationThread(destination, sourceThread, state) {
    const threadState = state.getThreadState(sourceThread.id);
    if (threadState.destinationThreadId) {
        try {
            const existing = await destination.client.channels.fetch(threadState.destinationThreadId);
            return { thread: existing, created: false };
        } catch (error) {
            console.warn(
                `Destination thread ${threadState.destinationThreadId} not found, resetting state and creating a new one`
            );
            state.resetThread(sourceThread.id);
        }
    }

    if (state.isProcessed(sourceThread.id)) {
        const existingByName = await findDestinationThreadByName(destination, sourceThread);
        if (existingByName) return { thread: existingByName, created: false };
    }

    const starter = await destination.send({ content: sourceThread.name });
    const destinationThread = await starter.startThread({ name: sourceThread.name });
    return { thread: destinationThread, created: true };
}

async function processThread(sourceThread, destination, filter, state) {
    const skipReason = await filter.shouldSkip(sourceThread);

    if (skipReason) {
        console.log(`Skipping "${sourceThread.name}": ${skipReason}`);
        return false;
    }

    const mediaByMessage = await collectThreadMedia(sourceThread);
    const newMedia = mediaByMessage.filter(
        ({ sourceMessageId }) => !state.hasPostedMessage(sourceThread.id, sourceMessageId)
    );

    if (newMedia.length === 0) {
        console.log(`No new media in "${sourceThread.name}"`);
        return false;
    }

    const { thread: destinationThread, created } = await getOrCreateDestinationThread(
        destination,
        sourceThread,
        state
    );
    if (created) {
        console.log(`Created thread: ${destinationThread.name}`);
    }

    await postMediaToThread(destinationThread, newMedia);
    for (const { sourceMessageId } of newMedia) {
        state.markPostedMessage(sourceThread.id, sourceMessageId, destinationThread.id);
    }
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

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const thread of allThreads) {
            try {
                const changed = await processThread(thread, destination, filter, state);
                if (changed) updated++;
                else skipped++;
            } catch (error) {
                console.error(`Failed to process "${thread.name}":`, error);
                failed++;
            }
        }

        console.log(`Finished: ${updated} updated, ${skipped} skipped, ${failed} failed`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exitCode = 1;
    } finally {
        await client.destroy();
    }
}

main();
