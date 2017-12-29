const {
    stream: { pull },
    std: { fs }
} = adone;

export default function (filename, opts) {
    const mode = opts && opts.mode || 0o666;
    const bufferSize = opts && opts.bufferSize || 1024 * 64;
    let start = opts && opts.start || 0;
    const end = opts && opts.end || Number.MAX_SAFE_INTEGER;
    let fd = opts && opts.fd;

    let ended;
    let closeNext;
    let busy;
    let _buffer = Buffer.alloc(bufferSize);
    let live = opts && Boolean(opts.live);
    let liveCb;
    let closeCb;
    let watcher;
    if (live) {
        watcher = fs.watch(filename, {
            persistent: opts.persistent !== false
        },
        (event) => {
            if (liveCb && event === "change") {
                const cb = liveCb;
                liveCb = null;
                closeNext = false;
                readNext(cb);
            }
        });
    }

    const flags = opts && opts.flags || "r";

    const close = (cb) => {
        if (!cb) {
            throw new Error("close must have cb");

        }
        if (watcher) {
            watcher.close();
        }
        //if auto close is disabled, then user manages fd.
        if (opts && opts.autoClose === false) {
            return cb(true);
        } else if (busy) {
            //wait until we have got out of bed, then go back to bed.
            //or if we are reading, wait till we read, then go back to bed.
            closeCb = cb;
            return closeNext = true;
        } else if (!fd) {
            //first read was close, don't even get out of bed.
            return cb(true);
        }

        //go back to bed

        fs.close(fd, (err) => {
            fd = null;
            cb(err || true);
        });
    };


    const readNext = (cb) => {
        if (closeNext) {
            if (!live) {
                close(cb);
            } else {
                liveCb = cb;
            }
            return;
        }
        const toRead = Math.min(end - start, bufferSize);
        busy = true;

        fs.read(
            fd,
            _buffer,
            0,
            toRead,
            start,
            (err, count, buffer) => {
                busy = false;
                start += count;
                // if we have received an end noticiation, just discard this data
                if (closeNext && !live) {
                    close(closeCb);
                    return cb(closeNext);
                }

                if (ended) {
                    return cb(err || ended);
                }

                // if we encountered a read error pass it on
                if (err) {
                    return cb(err);
                }

                if (count === buffer.length) {
                    cb(null, buffer);
                } else if (count === 0 && live) {
                    liveCb = cb; closeNext = true;
                } else {
                    closeNext = true;
                    cb(null, buffer.slice(0, count));
                }
            }
        );
        _buffer = Buffer.allocUnsafe(Math.min(end - start, bufferSize));
    };

    const open = (cb) => {
        busy = true;
        fs.open(filename, flags, mode, (err, descriptor) => {
            // save the file descriptor
            fd = descriptor;

            busy = false;
            if (closeNext) {
                close(closeCb);
                return cb(closeNext);
            }

            if (err) {
                return cb(err);
            }

            // read the next bytes
            return readNext(cb);
        });
    };

    const source = (end, cb) => {
        if (end) {
            ended = end;
            live = false;
            if (liveCb) {
                liveCb(end || true);
            }
            close(cb);
        } else if (ended) {
            // if we have already received the end notification, abort further
            cb(ended);
        } else if (! fd) {
            open(cb);
        } else {
            readNext(cb);
        }
    };

    //read directly to text
    if (opts && opts.encoding) {
        return pull.utf8decoder(opts.encoding)(source);
    }

    return source;
}

