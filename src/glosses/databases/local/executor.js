
const { collection, is } = adone;

export default class Executor {
    constructor() {
        this.buffer = new collection.LinkedList();
        this.ready = false;

        this.queue = new collection.BQueue();

        (async () => {
            for (;;) {
                // eslint-disable-next-line no-await-in-loop
                const data = await this.queue.shift();
                try {
                    const res = data.task();
                    if (is.promise(res)) {
                        // eslint-disable-next-line no-await-in-loop
                        await res.then(data.resolve, data.reject);
                    }
                    data.resolve(res);
                } catch (err) {
                    data.reject(err);
                }
            }
        })();
    }

    push(task, forceQueuing) {
        return new Promise((resolve, reject) => {
            const _t = { resolve, reject, task };
            if (this.ready || forceQueuing) {
                this.queue.push(_t);
            } else {
                this.buffer.push(_t);
            }
        });
    }

    processBuffer() {
        this.ready = true;
        while (!this.buffer.empty) {
            this.queue.push(this.buffer.shift());
        }
    }
}
