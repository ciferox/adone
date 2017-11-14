const {
    event: { EventEmitter },
    collection: { LinkedList },
    netron: { ACTION, SequenceId }
} = adone;

export default class Stream extends EventEmitter {
    constructor({ peer, id, highWaterMark, allowHalfOpen }) {
        super();

        this.peer = peer;
        this.netron = peer.netron;
        this.id = id;
        this.remoteId = null;
        this.packetId = new SequenceId();
        this._lastPacketId = 0;
        this._endPacketId = 0;

        this._readableState = {
            highWaterMark,
            nullPushed: false,
            flowing: false,
            pauseSended: false,
            buffer: new LinkedList()
        };

        this._writableState = {
            remotePaused: false,
            needDrain: false,
            buffer: new LinkedList()
        };

        this.allowHalfOpen = allowHalfOpen;
        this._writing = false;
        this._waitForDrain = false;
        this.ending = false;
        this.remoteEnding = false;
        this.ended = false;
        this.remoteEnded = false;
    }

    write(chunk) {
        if (this.ending || this.ended) {
            throw new Error("end() was called");
        }
        if (this._writing) {
            this._writableState.buffer.push(chunk);
        } else {
            this._write(chunk);
        }
        if (this._writableState.remotePaused) {
            this._writableState.needDrain = true;
        }
        return !this._writableState.remotePaused;
    }

    _write(chunk) {
        if (this.ended) {
            this._writing = false;
            return;
        }
        this._writing = true;
        this.netron.send(this.peer, 0, this.id, this.packetId.next(), ACTION.STREAM_DATA, chunk).catch((err) => this.emit("error", err)).then(() => {
            if (!this._writableState.buffer.empty && !this._writableState.remotePaused) {
                this._write(this._writableState.buffer.shift());
            } else {
                this._writing = false;
                if (this.ending) {
                    this._wEnd();
                } else if (this._writableState.needDrain && this._writableState.buffer.empty) {
                    this._writableState.needDrain = false;
                    this.emit("drain");
                }
            }
        });
    }

    end() {
        if (!this.ending) {
            this.ending = true;
            this._wEnd();
        }
    }

    _remoteEnd(packetId) {
        this._endPacketId = packetId;
        if (!this.remoteEnding) {
            this._rEnd();
        }
    }

    _wEnd() {
        if (!this._writing && this._writableState.buffer.empty) {
            this.netron.send(this.peer, 0, this.id, this.packetId.next(), ACTION.STREAM_END).catch((err) => this.emit("error", err)).then(() => {
                this.ending = false;
                this.ended = true;
                if (!this.allowHalfOpen) {
                    this._rEnd();
                }
            });
        }
    }

    _rEnd() {
        this.remoteEnding = true;
        if (this._endPacketId === 0 || this._endPacketId === (this._lastPacketId + 1)) {
            if (this._readableState.buffer.empty) {
                this.remoteEnding = false;
                this.remoteEnded = true;
                this.emit("end");
                this.peer._streams.delete(this.remoteId);
            }
        }
    }

    _push(chunk, packetId) {
        if (this._readableState.nullPushed) {
            return false;
        }
        this._lastPacketId = packetId;
        if (chunk === adone.null) {
            this._readableState.nullPushed = true;
            this._rEnd();
            return false;
        }
        if (this._readableState.flowing && this._readableState.buffer.empty) {
            this.emit("data", chunk);
        } else {
            this._readableState.buffer.push(chunk);
        }

        if (this._readableState.buffer.length >= this._readableState.highWaterMark && !this._readableState.pauseSended) {
            this._readableState.pauseSended = true;
            this.netron.send(this.peer, 0, this.id, this.packetId.next(), ACTION.STREAM_PAUSE).catch((err) => this.emit("error", err));
        }

        return true;
    }

    pipe(dst, { end = true } = {}) {
        const src = this;

        let dstEnd = false;
        const onData = (x) => {
            if (!dstEnd && !dst.write(x)) {
                src._waitForDrain = true;
                src.pause();
            }
        };

        const onDrain = () => {
            src._waitForDrain = false;
            src.resume();
        };

        const onDstEnd = () => {
            dstEnd = true;
        };

        src.on("data", onData);
        dst.on("drain", onDrain);
        if (dst === process.stdout || dst === process.stderr) {
            end = false;
        }
        if (end) {
            src.once("end", () => {
                src.removeListener("data", onData);
                dst.removeListener("drain", onDrain);
                dst.removeListener("end", onDstEnd);
                dst.end();
            });
        }
        dst.once("end", onDstEnd);
        if (!src._readableState.flowing) {
            process.nextTick(() => src.resume());
        }
        return dst;
    }

    pause() {
        this._readableState.flowing = false;
        return this;
    }

    resume() {
        if (this.remoteEnded || this._readableState.flowing || this._waitForDrain) {
            return this;
        }
        this._readableState.flowing = true;

        while (this._readableState.flowing) {
            if (this._readableState.buffer.empty) {
                break;
            }
            this.emit("data", this._readableState.buffer.shift());
        }

        if (this._readableState.pauseSended) {
            this._readableState.pauseSended = false;
            this.netron.send(this.peer, 0, this.id, this.packetId.next(), ACTION.STREAM_RESUME).catch((err) => this.emit("error", err));
        }
        if (this.remoteEnding && this._readableState.buffer.empty) {
            this._rEnd();
        }
        return this;
    }

    _receivePause() {
        this._writableState.remotePaused = true;
    }

    _receiveResume() {
        this._writableState.remotePaused = false;
    }

    waitForAccept() {
        return new Promise((resolve, reject) => {
            this.once("error", reject);
            this.once("accept", resolve);
        });
    }

    _remoteAccepted(remoteStreamId) {
        this.emit("accept", remoteStreamId);
    }
}
adone.tag.add(Stream, "NETRON_STREAM");
