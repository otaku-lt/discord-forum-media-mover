const { DISCORD_FETCH_MESSAGES_LIMIT, DISCORD_MESSAGE_LIMIT } = require('./constants');
const { isMediaAttachment } = require('./filters');
const { chunkStrings } = require('./helpers');

async function collectThreadMedia(thread) {
    const mediaByMessage = [];
    let lastId;

    while (true) {
        const messages = await thread.messages.fetch({
            limit: DISCORD_FETCH_MESSAGES_LIMIT,
            before: lastId,
        });
        if (messages.size === 0) break;

        for (const message of [...messages.values()].reverse()) {
            const mediaUrls = message.attachments
                .filter(isMediaAttachment)
                .map(attachment => attachment.url);

            if (mediaUrls.length > 0) {
                mediaByMessage.push({ messageUrl: message.url, mediaUrls });
            }
        }

        lastId = messages.last().id;
    }

    return mediaByMessage;
}

async function postMediaToThread(destinationThread, mediaByMessage) {
    for (const { messageUrl, mediaUrls } of mediaByMessage) {
        const header = `[Jump to original](${messageUrl})\n`;
        const chunks = chunkStrings(mediaUrls, DISCORD_MESSAGE_LIMIT, header);

        for (const chunk of chunks) {
            await destinationThread.send({ content: chunk });
        }
    }
}

module.exports = {
    collectThreadMedia,
    postMediaToThread,
};
