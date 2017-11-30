const utils = require("./utils");
const helpers = require("./queryhelpers");

const {
    is,
    std: { stream: { Stream } }
} = adone;

// trampoline flags
const T_INIT = 0;
const T_IDLE = 1;
const T_CONT = 2;

/*!
 * Emit a data event and manage the trampoline state
 */
const emit = function (self, doc) {
    self.emit("data", self._transform(doc));

    // trampoline management
    if (T_IDLE === self._inline) {
        // no longer in trampoline. restart it.
        self._next();
    } else {
        // in a trampoline. tell __next that its
        // ok to continue jumping.
        self._inline = T_CONT;
    }
};


const createAndEmit = function (self, populatedIds, doc) {
    const instance = helpers.createModel(self.query.model, doc, self._fields);
    const opts = populatedIds ?
        { populated: populatedIds } :
        undefined;

    instance.init(doc, opts, (err) => {
        if (err) {
            return self.destroy(err);
        }
        emit(self, instance);
    });
};

/**
 * Provides a Node.js 0.8 style [ReadStream](http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream) interface for Queries.
 *
 *     var stream = Model.find().stream();
 *
 *     stream.on('data', function (doc) {
 *       // do something with the mongoose document
 *     }).on('error', function (err) {
 *       // handle the error
 *     }).on('close', function () {
 *       // the stream is closed
 *     });
 *
 *
 * The stream interface allows us to simply "plug-in" to other _Node.js 0.8_ style write streams.
 *
 *     Model.where('created').gte(twoWeeksAgo).stream().pipe(writeStream);
 *
 * ####Valid options
 *
 *   - `transform`: optional function which accepts a mongoose document. The return value of the function will be emitted on `data`.
 *
 * ####Example
 *
 *     // JSON.stringify all documents before emitting
 *     var stream = Thing.find().stream({ transform: JSON.stringify });
 *     stream.pipe(writeStream);
 *
 * _NOTE: plugging into an HTTP response will *not* work out of the box. Those streams expect only strings or buffers to be emitted, so first formatting our documents as strings/buffers is necessary._
 *
 * _NOTE: these streams are Node.js 0.8 style read streams which differ from Node.js 0.10 style. Node.js 0.10 streams are not well tested yet and are not guaranteed to work._
 *
 * @param {Query} query
 * @param {Object} [options]
 * @inherits NodeJS Stream http://nodejs.org/docs/v0.8.21/api/stream.html#stream_readable_stream
 * @event `data`: emits a single Mongoose document
 * @event `error`: emits when an error occurs during streaming. This will emit _before_ the `close` event.
 * @event `close`: emits when the stream reaches the end of the cursor or an error occurs, or the stream is manually `destroy`ed. After this event, no more events are emitted.
 * @api public
 */
export default class QueryStream extends Stream {
    constructor(query, options) {
        super();

        this.query = query;
        this.readable = true;
        this.paused = false;
        this._cursor = null;
        this._destroyed = null;
        this._fields = null;
        this._buffer = null;
        this._inline = T_INIT;
        this._running = false;
        this._transform = options && is.function(options.transform) ? options.transform : adone.identity;

        // give time to hook up events
        const _this = this;
        process.nextTick(() => {
            _this._init();
        });
    }

    /**
     * Initializes the query.
     *
     * @api private
     */
    _init() {
        if (this._destroyed) {
            return;
        }

        const query = this.query;
        const model = query.model;
        const options = query._optionsForExec(model);
        const _this = this;

        try {
            query.cast(model);
        } catch (err) {
            return _this.destroy(err);
        }

        _this._fields = utils.clone(query._fields);
        options.fields = query._castFields(_this._fields);

        model.collection.find(query._conditions, options, (err, cursor) => {
            if (err) {
                return _this.destroy(err);
            }
            _this._cursor = cursor;
            _this._next();
        });
    }

    /**
     * Trampoline for pulling the next doc from cursor.
     *
     * @see QueryStream#__next #querystream_QueryStream-__next
     * @api private
     */
    _next() {
        if (this.paused || this._destroyed) {
            this._running = false;
            return this._running;
        }

        this._running = true;

        if (this._buffer && this._buffer.length) {
            let arg;
            while (!this.paused && !this._destroyed && (arg = this._buffer.shift())) { // eslint-disable-line no-cond-assign
                this._onNextObject.apply(this, arg);
            }
        }

        // avoid stack overflows with large result sets.
        // trampoline instead of recursion.
        while (this.__next()) {
            //
        }
    }

    /**
     * Pulls the next doc from the cursor.
     *
     * @see QueryStream#_next #querystream_QueryStream-_next
     * @api private
     */
    __next() {
        if (this.paused || this._destroyed) {
            this._running = false;
            return this._running;
        }

        const _this = this;
        _this._inline = T_INIT;

        _this._cursor.nextObject(function cursorcb(err, doc) {
            _this._onNextObject(err, doc);
        });

        // if onNextObject() was already called in this tick
        // return ourselves to the trampoline.
        if (T_CONT === this._inline) {
            return true;
        }
        // onNextObject() hasn't fired yet. tell onNextObject
        // that its ok to call _next b/c we are not within
        // the trampoline anymore.
        this._inline = T_IDLE;
    }

    /**
     * Transforms raw `doc`s returned from the cursor into a model instance.
     *
     * @param {Error|null} err
     * @param {Object} doc
     * @api private
     */
    _onNextObject(err, doc) {
        if (this._destroyed) {
            return;
        }

        if (this.paused) {
            this._buffer || (this._buffer = []);
            this._buffer.push([err, doc]);
            this._running = false;
            return this._running;
        }

        if (err) {
            return this.destroy(err);
        }

        // when doc is null we hit the end of the cursor
        if (!doc) {
            this.emit("end");
            return this.destroy();
        }

        const opts = this.query._mongooseOptions;

        if (!opts.populate) {
            return opts.lean === true ?
                emit(this, doc) :
                createAndEmit(this, null, doc);
        }

        const _this = this;
        const pop = helpers.preparePopulationOptionsMQ(_this.query, _this.query._mongooseOptions);

        // Hack to work around gh-3108
        pop.forEach((option) => {
            delete option.model;
        });

        pop.__noPromise = true;
        _this.query.model.populate(doc, pop, (err, doc) => {
            if (err) {
                return _this.destroy(err);
            }
            return opts.lean === true ?
                emit(_this, doc) :
                createAndEmit(_this, pop, doc);
        });
    }

    /**
     * Pauses this stream.
     *
     * @api public
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resumes this stream.
     *
     * @api public
     */
    resume() {
        this.paused = false;

        if (!this._cursor) {
            // cannot start if not initialized
            return;
        }

        // are we within the trampoline?
        if (T_INIT === this._inline) {
            return;
        }

        if (!this._running) {
            // outside QueryStream control, need manual restart
            return this._next();
        }
    }

    /**
     * Destroys the stream, closing the underlying cursor, which emits the close event. No more events will be emitted after the close event.
     *
     * @param {Error} [err]
     * @api public
     */
    destroy(err) {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        this._running = false;
        this.readable = false;

        if (this._cursor) {
            this._cursor.close();
        }

        if (err) {
            this.emit("error", err);
        }

        this.emit("close");
    }
}

/**
 * Flag stating whether or not this stream is readable.
 *
 * @property readable
 * @api public
 */

QueryStream.prototype.readable;

/**
 * Flag stating whether or not this stream is paused.
 *
 * @property paused
 * @api public
 */

QueryStream.prototype.paused;
