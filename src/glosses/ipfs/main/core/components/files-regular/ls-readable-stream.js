const {
    stream: { pull }
} = adone;
const { pullStreamToStream: toStream } = pull;

module.exports = function (self) {
    return (ipfsPath, options) => {
        return toStream.source(self.lsPullStream(ipfsPath, options));
    };
};
