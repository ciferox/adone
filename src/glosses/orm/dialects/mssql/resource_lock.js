export default class ResourceLock {
    constructor(resource) {
        this.resource = resource;
        this.q = new adone.collection.AsyncQueue();
        this.q.push(null);
    }

    unwrap() {
        return this.resource;
    }

    unlock() {
        this.q.push(null);
    }

    async lock() {
        await this.q.pop();
        return this.resource;
    }
}
