const fs = require('fs');
const yaml = require('js-yaml');

class ProcessedThreadsState {
    constructor(filePath) {
        this.filePath = filePath;
        this.threads = this.load();
    }

    load() {
        if (!fs.existsSync(this.filePath)) return {};
        const data = yaml.load(fs.readFileSync(this.filePath, 'utf8')) || {};
        return this.migrate(data);
    }

    /**
     * Migrates legacy state format:
     *   threads: [id1, id2]
     * to the current format:
     *   threads:
     *     id1: { destinationThreadId: null, postedMessageIds: [] }
     */
    migrate(data) {
        if (!Array.isArray(data.threads)) return data.threads || {};

        const migrated = {};
        for (const threadId of data.threads) {
            migrated[threadId] = { destinationThreadId: null, postedMessageIds: [] };
        }
        return migrated;
    }

    save() {
        fs.writeFileSync(this.filePath, yaml.dump({ threads: this.threads }));
    }

    getThreadState(threadId) {
        return this.threads[threadId] || { destinationThreadId: null, postedMessageIds: [] };
    }

    hasPostedMessage(threadId, messageId) {
        const state = this.getThreadState(threadId);
        return state.postedMessageIds.includes(messageId);
    }

    markPostedMessage(threadId, messageId, destinationThreadId) {
        if (!this.threads[threadId]) {
            this.threads[threadId] = { destinationThreadId, postedMessageIds: [] };
        }

        const state = this.threads[threadId];
        if (destinationThreadId) {
            state.destinationThreadId = destinationThreadId;
        }
        if (!state.postedMessageIds.includes(messageId)) {
            state.postedMessageIds.push(messageId);
        }

        this.save();
    }

    isProcessed(threadId) {
        return !!this.threads[threadId];
    }

    resetThread(threadId) {
        if (this.threads[threadId]) {
            this.threads[threadId] = { destinationThreadId: null, postedMessageIds: [] };
            this.save();
        }
    }
}

module.exports = { ProcessedThreadsState };
