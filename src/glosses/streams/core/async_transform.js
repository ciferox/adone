import Transform from "./transform";

const { collection } = adone;

/**
 * Represents a tranform stream that implements asynchronous processing
 */
export default class AsyncTransform extends Transform {
    constructor(transform, flush) {
        super(transform, flush);
        this._processingQueue = new collection.LinkedList();
    }

    async _process(value) {
        if (this._processing) {
            this._processingQueue.push(value);
            return;
        }
        this._processing = true;
        /**
         * ??
         * normalize the behaviour
         * each written element will be surely processed asynchronously
         * not on the same tick with the write operation.
         * otherways:
         * s.write(1); s.write(2); s.push(3); s.push(4);
         * will produce
         * 1, 3, 4, 2
         * but this way
         * 3, 4, 1, 2
         */
        await null;
        for (let processingValue = value; ; processingValue = this._processingQueue.shift()) {
            try {
                await this._transform(processingValue); // eslint-disable-line no-await-in-loop
            } catch (err) {
                this._onError(err);
            }
            if (this._processingQueue.empty) {
                break;
            }
        }
        this._processing = false;
        this.maybeFlush();
    }

    destroy() {
        if (this._destroyed) {
            return this;
        }
        this._processingQueue.clear();
        return super.destroy();
    }
}
