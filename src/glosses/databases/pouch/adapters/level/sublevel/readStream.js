/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

// NOTE: we are fixed to readable-stream@1.0.x for now
// for pure Streams2 across Node versions
const {
    is,
    std: {
        stream: { Readable },
        util: { inherits }
    }
} = adone;

export default function ReadStream(options, makeData) {
    if (!(this instanceof ReadStream)) {
        return new ReadStream(options, makeData);
    }

    Readable.call(this, { objectMode: true, highWaterMark: options.highWaterMark });

    // purely to keep `db` around until we're done so it's not GCed if the user doesn't keep a ref

    this._waiting = false;
    this._options = options;
    this._makeData = makeData;
}

inherits(ReadStream, Readable);

ReadStream.prototype.setIterator = function (it) {
    this._iterator = it;
    /* istanbul ignore if */
    if (this._destroyed) {
        return it.end(() => { });
    }
    /* istanbul ignore if */
    if (this._waiting) {
        this._waiting = false;
        return this._read();
    }
    return this;
};

ReadStream.prototype._read = function () {
    const self = this;
    /* istanbul ignore if */
    if (self._destroyed) {
        return;
    }
    /* istanbul ignore if */
    if (!self._iterator) {
        return this._waiting = true;
    }

    self._iterator.next((err, key, value) => {
        if (err || (is.undefined(key) && is.undefined(value))) {
            if (!err && !self._destroyed) {
                self.push(null);
            }
            return self._cleanup(err);
        }


        value = self._makeData(key, value);
        if (!self._destroyed) {
            self.push(value);
        }
    });
};

ReadStream.prototype._cleanup = function (err) {
    if (this._destroyed) {
        return;
    }

    this._destroyed = true;

    const self = this;
    /* istanbul ignore if */
    if (err && err.message !== "iterator has ended") {
        self.emit("error", err);
    }

    /* istanbul ignore else */
    if (self._iterator) {
        self._iterator.end(() => {
            self._iterator = null;
            self.emit("close");
        });
    } else {
        self.emit("close");
    }
};

ReadStream.prototype.destroy = function () {
    this._cleanup();
};
