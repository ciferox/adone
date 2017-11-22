class PriorityQueueElement {
    constructor(request, priority) {
        this.request = request;
        this.priority = priority;
    }

    static priority(a, b) {
        return b.priority - a.priority;
    }

    static compare(a, b) {
        if (a.request === b.request) {
            return 0;
        }
        return 1;
    }
}

export default class PriorityQueue extends adone.collection.PriorityQueue {
    constructor() {
        super({
            priority: PriorityQueueElement.priority,
            compare: PriorityQueueElement.compare
        });
    }

    push(request, priority) {
        const node = new PriorityQueueElement(request, priority);
        request.promise.catch(this._createTimeoutRejectionHandler(node));
        return super.push(node);
    }

    _createTimeoutRejectionHandler(node) {
        return (reason) => {
            if (reason.name === "TimeoutError") {
                this.delete(node);
            }
        };
    }

    pop() {
        if (this.length === 0) {
            return;
        }
        return super.pop().request;
    }
}
