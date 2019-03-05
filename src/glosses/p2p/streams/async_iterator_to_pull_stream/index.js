const getIterator = require("get-iterator");

const {
    p2p: { stream: { pullStreamToAsyncIterator: toIterable } }
} = adone;

function toPull(iterator) {
    iterator = getIterator(iterator);

    return async (end, cb) => {
        if (end) {
            return cb(end);
        }

        let next;
        try {
            next = await iterator.next();
        } catch (err) {
            return cb(err);
        }

        if (next.done) return cb(true) // eslint-disable-line
        cb(null, next.value);
    };
}

toPull.through = (factory) => (read) => toPull(factory(toIterable(read)));

module.exports = toPull;
