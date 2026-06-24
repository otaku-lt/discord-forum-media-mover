const fs = require('fs');
const yaml = require('js-yaml');

class ProcessedThreadsState {
    constructor(filePath) {
        this.filePath = filePath;
        this.processedIds = this.load();
    }

    load() {
        if (!fs.existsSync(this.filePath)) return new Set();
        const data = yaml.load(fs.readFileSync(this.filePath, 'utf8'));
        return new Set(data?.threads || []);
    }

    save() {
        fs.writeFileSync(this.filePath, yaml.dump({ threads: [...this.processedIds] }));
    }

    has(threadId) {
        return this.processedIds.has(threadId);
    }

    mark(threadId) {
        if (!this.processedIds.has(threadId)) {
            this.processedIds.add(threadId);
            this.save();
        }
    }
}

module.exports = { ProcessedThreadsState };
