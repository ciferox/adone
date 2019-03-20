const {
    stream: { pull }
} = adone;
const { pair: { duplex: pullPairDuplex } } = pull;

export const createPair = function (muxer, callback) {
    const pair = pullPairDuplex();

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
};
