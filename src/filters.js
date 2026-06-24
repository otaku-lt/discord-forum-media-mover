const { SUPPORTED_MEDIA_TYPES } = require('./constants');

function isMediaAttachment(attachment) {
    return SUPPORTED_MEDIA_TYPES.some(type => attachment.contentType?.startsWith(type));
}

/**
 * Returns true when the thread has only its starter message and no replies.
 * Edits to the starter message do not change the count, so they are ignored.
 * Threads that match this are skipped entirely, including any media in the starter post.
 */
async function isSinglePostThread(thread) {
    const messages = await thread.messages.fetch({ limit: 2 });
    return messages.size <= 1;
}

function extractEventDate(threadName) {
    // TODO - need to find or agree on the event naming format to properly extract things in chronological order...
    const isoMatch = threadName.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
        const date = new Date(isoMatch[0]);
        if (!isNaN(date)) return date;
    }

    const euMatch = threadName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (euMatch) {
        const [, day, month, year] = euMatch;
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date)) return date;
    }

    return null;
}

function isFutureEvent(thread) {
    const eventDate = extractEventDate(thread.name);
    return eventDate ? eventDate > new Date() : false;
}

class ThreadFilter {
    constructor(config) {
        this.excludedIds = config.excludedThreadIds;
    }

    async shouldSkip(thread) {
        if (this.excludedIds.has(thread.id)) return 'excluded';
        if (await isSinglePostThread(thread)) return 'single post';
        if (isFutureEvent(thread)) return 'future event';
        return null;
    }
}

function sortByEventDate(threads) {
    return [...threads].sort((a, b) => {
        const dateA = extractEventDate(a.name);
        const dateB = extractEventDate(b.name);

        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;

        return a.name.localeCompare(b.name);
    });
}

module.exports = {
    isMediaAttachment,
    isSinglePostThread,
    extractEventDate,
    isFutureEvent,
    ThreadFilter,
    sortByEventDate,
};
