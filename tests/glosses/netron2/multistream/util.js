const {
    stream: { pull }
} = adone;

function createPair(muxer, callback) {
    const pair = pull.pair.duplex();

    if (!muxer) {
        return callback(null, pair);
    }

    if (!muxer.dialer || !muxer.listener) {
        return callback(new Error("invalid muxer"));
    }

    const muxDialer = muxer.dialer(pair[0]);
    const muxListener = muxer.listener(pair[1]);
    let dialerConn;

    muxListener.once("stream", (conn) => {
        callback(null, [dialerConn, conn]);
    });

    dialerConn = muxDialer.newStream();
}

exports = module.exports;
exports.createPair = createPair;
