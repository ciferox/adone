const {
    collection,
    noop,
    error,
    is
} = adone;

/**
 * Represents an abstact transform stream
 */
export default class Transform {
    /**
     * @param {Function} transform function that's called for each next element
     * @param {Function} flush function that's called when the stream ends, but before the onEnd handler
     */
    constructor(transform, flush) {
        this._paused = true;
        this._onNext = noop;
        this._onEnd = noop;
        this._onError = noop;
        this._outgoingQueue = new collection.Queue();
        this._processing = false;
        this._transform = transform;
        this._flush = flush;

        this._ending = false;
        this._flushing = false;
        this._flushed = false;
        this._ended = false;
        this._resumeScheduled = false;
        this._pausedAfterResume = false;
        this._destroyed = false;
    }

    isPaused() {
        return this._paused;
    }

    isEnded() {
        return this._ended;
    }

    /**
     * Transform/flush functon pushes new elements, this handler is called on each of them
     */
    onNext(handler) {
        this._onNext = handler;
        return this;
    }

    /**
     * When the stream has ended and flushed this handler is called
     */
    onEnd(handler) {
        this._onEnd = handler;
        return this;
    }

    /**
     * When error occures while flushing/transforming this handler is called
     */
    onError(handler) {
        this._onError = handler;
        return this;
    }

    /**
     * Pauses the stream
     */
    pause() {
        this._paused = true;
        if (this._resumeScheduled) {
            this._pausedAfterResume = true;
        }
        return this;
    }

    /**
     * Resumes the stream and flushes the outgoing queue
     */
    resume() {
        if (!this.isPaused()) {
            return this;
        }
        if (this._resumeScheduled) {
            if (this._pausedAfterResume) {
                this._pausedAfterResume = false;
            }
            return this;
        }
        this._resumeScheduled = true;
        process.nextTick(() => {
            this._resumeScheduled = false;
            if (this._pausedAfterResume) {
                this._pausedAfterResume = false;
                return;
            }
            while (!this._outgoingQueue.empty) {
                this._onNext(this._outgoingQueue.pop());
            }
            this._paused = false;
            this.maybeFlush();
        });
        return this;
    }

    /**
     * Pushes a new element into stream.
     * Pushed elements bypass the processing stage.
     * Puts it into the outgoing queue if the stream is paused.
     */
    push(value) {
        if (this._destroyed) { // destroyed streams do not emit elements
            return true;
        }
        if (this.isPaused()) {
            this._outgoingQueue.push(value);
        } else {
            this._onNext(value);
        }
    }

    /**
     * Writes a new value into the stream.
     * Written elements immediately go to the processing stage.
     */
    write(value) {
        if (this._ending) {
            throw new error.IllegalState("Write after end");
        }
        if (this._destroyed) {
            throw new error.IllegalState("destroyed");
        }
        this._process(value);
        return true;
    }

    /**
     * If end() was called, the processing is not active and there are no elements to emit(onNext)
     * we can go to the final stage(end), call the flush function and finally end the stream.
     * If the flushing fails, it emits onError and then onEnd.
     * We must not stop ending, the completion of any further streams is a must
     *
     * Flushing always completes asynchronously, so flush will be called on the next tick
     * and we will receive onEnd at least on the next tick
     */
    maybeFlush() {
        if (!this._ending) {
            return;
        }
        if (this._flushing) {
            if (this._flushed) {
                // flush pushed some elements, they have been emitted, end the stream
                // it completes at least on the next tick
                this._ended = true;
                this._onEnd();
            }
            return;
        }
        if (
            !this._processing
            && this._outgoingQueue.empty
        ) {
            this._flushing = true;

            const flush = () => {
                if (!this._flush) {
                    this._onEnd();
                    this._ended = true;
                    return;
                }

                if (is.asyncFunction(this._flush)) {
                    this._flush().then(() => {
                        this._flushed = true;
                        if (this._outgoingQueue.empty) {
                            this._ended = true;
                            this._onEnd();
                        }
                        // flush pushed some elements and they have not been emitted,
                        // the stream must be paused
                    }, (err) => {
                        this._flushed = true;
                        err.flushing = true;
                        this._onError(err);

                        if (this._outgoingQueue.empty) {
                            this._ended = true;
                            this._onEnd();
                        }
                        // flush pushed some elements and they have not been emitted,
                        // the stream must be paused
                    });
                } else {
                    try {
                        this._flush();
                    } catch (err) {
                        err.flushing = true;
                        this._onError(err);
                    }
                    this._flushed = true;
                    if (this._outgoingQueue.empty) {
                        this._ended = true;
                        this._onEnd();
                    }
                    // flush pushed some elements and they have not been emitted,
                    // the stream must be paused
                }
            };

            const _flush = () => {
                if (this._resumeScheduled) {
                    // schedule flush always after resume
                    process.nextTick(_flush);
                } else {
                    flush();
                }
            };

            process.nextTick(_flush);
        }
    }

    /**
     * Initiates the ending stage
     */
    end() {
        if (!this._ending) {
            this._ending = true;
            this.maybeFlush();
        }
        return this;
    }

    /**
     * Destoyes the stream.
     * Stream will not emit onNext event, will process no further elements.
     * Initiates the ending stage. We must end all the streams, call all the flush functions,
     * they can complete some cleaning actions, like closing descriptors etc.
     */
    destroy() {
        if (this._destroyed) {
            return this;
        }
        this._destroyed = true;
        this.onNext(noop);
        this._outgoingQueue.clear();
        return this.end();
    }

    /**
     * Pipes this transform stream to another transform stream
     */
    pipe(target) {
        this.onNext((value) => {
            target.write(value);
        });
        this.onEnd(() => {
            target.end();
        });
        return target;
    }
}
