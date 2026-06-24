const { DISCORD_MESSAGE_LIMIT } = require('./constants');

/**
 * Splits an array of strings into chunks that each fit within maxLength,
 * prepending the prefix only to the first chunk.
 */
function chunkStrings(strings, maxLength = DISCORD_MESSAGE_LIMIT, prefix = '') {
    const chunks = [];
    let current = null;

    for (const str of strings) {
        if (current === null) {
            current = prefix + str;
        } else if (current.length + 1 + str.length > maxLength) {
            chunks.push(current);
            current = str;
        } else {
            current += '\n' + str;
        }
    }

    if (current !== null) chunks.push(current);
    return chunks;
}

module.exports = { chunkStrings };
