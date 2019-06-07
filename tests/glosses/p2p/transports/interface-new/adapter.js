const {
    is,
    noop,
    p2p: { Connection },
    stream: { pull }
} = adone;
const { error, drain, asyncIteratorToPullStream } = pull;

const callbackify = (fn) => async function (...args) {
    let cb = args.pop();
    if (!is.function(cb)) {
        args.push(cb);
        cb = noop;
    }
    let res;
    try {
        res = await fn(...args);
    } catch (err) {
        return cb(err);
    }
    cb(null, res);
};

// Legacy adapter to old transport & connection interface
class Adapter {
    constructor(transport) {
        this.transport = transport;
    }

    dial(ma, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        callback = callback || noop;

        const conn = new Connection();

        this.transport.dial(ma, options)
            .then((socket) => {
                conn.setInnerConn(asyncIteratorToPullStream.duplex(socket));
                conn.getObservedAddrs = callbackify(socket.getObservedAddrs.bind(socket));
                conn.close = callbackify(socket.close.bind(socket));
                callback(null, conn);
            })
            .catch((err) => {
                conn.setInnerConn({ sink: drain(), source: error(err) });
                callback(err);
            });

        return conn;
    }

    createListener(options, handler) {
        if (is.function(options)) {
            handler = options;
            options = {};
        }

        const server = this.transport.createListener(options, (socket) => {
            const conn = new Connection(asyncIteratorToPullStream.duplex(socket));
            conn.getObservedAddrs = callbackify(socket.getObservedAddrs.bind(socket));
            handler(conn);
        });

        const proxy = {
            listen: callbackify(server.listen.bind(server)),
            close: callbackify(server.close.bind(server)),
            getAddrs: callbackify(server.getAddrs.bind(server)),
            getObservedAddrs: callbackify(() => server.getObservedAddrs())
        };

        return new Proxy(server, { get: (_, prop) => proxy[prop] || server[prop] });
    }
}

module.exports = Adapter;
