const { messages, codes } = require("./errors");
const errCode = require("err-code");

const {
    async: { nextTick },
    is,
    p2p: { FloodSub }
} = adone;

module.exports = (node) => {
    const floodSub = new FloodSub(node);

    node._floodSub = floodSub;

    return {
        subscribe: (topic, options, handler, callback) => {
            if (is.function(options)) {
                callback = handler;
                handler = options;
                options = {};
            }

            if (!node.isStarted() && !floodSub.started) {
                return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED));
            }

            const subscribe = function (cb) {
                if (floodSub.listenerCount(topic) === 0) {
                    floodSub.subscribe(topic);
                }

                floodSub.on(topic, handler);
                nextTick(cb);
            };

            subscribe(callback);
        },

        unsubscribe: (topic, handler, callback) => {
            if (!node.isStarted() && !floodSub.started) {
                return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED));
            }
            if (!handler && !callback) {
                floodSub.removeAllListeners(topic);
            } else {
                floodSub.removeListener(topic, handler);
            }

            if (floodSub.listenerCount(topic) === 0) {
                floodSub.unsubscribe(topic);
            }

            if (is.function(callback)) {
                nextTick(() => callback());
            }
        },

        publish: (topic, data, callback) => {
            if (!node.isStarted() && !floodSub.started) {
                return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED));
            }

            if (!is.buffer(data)) {
                return nextTick(callback, errCode(new Error("data must be a Buffer"), "ERR_DATA_IS_NOT_A_BUFFER"));
            }

            floodSub.publish(topic, data, callback);
        },

        ls: (callback) => {
            if (!node.isStarted() && !floodSub.started) {
                return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED));
            }

            const subscriptions = Array.from(floodSub.subscriptions);

            nextTick(() => callback(null, subscriptions));
        },

        peers: (topic, callback) => {
            if (!node.isStarted() && !floodSub.started) {
                return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED));
            }

            if (is.function(topic)) {
                callback = topic;
                topic = null;
            }

            const peers = Array.from(floodSub.peers.values())
                .filter((peer) => topic ? peer.topics.has(topic) : true)
                .map((peer) => peer.info.id.toB58String());

            nextTick(() => callback(null, peers));
        },

        setMaxListeners(n) {
            return floodSub.setMaxListeners(n);
        }
    };
};
