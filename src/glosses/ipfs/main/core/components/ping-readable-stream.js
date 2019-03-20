const {
    stream: { pull }
} = adone;
const { pullStreamToStream } = pull;

module.exports = function pingReadableStream(self) {
    return (peerId, opts) => pullStreamToStream.source(self.pingPullStream(peerId, opts));
};
