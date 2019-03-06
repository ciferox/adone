const {
    stream: { pull2: pull }
} = adone;
const { pullStreamToStream: toStream } = pull;

module.exports = function (self) {
    return (ipfsPath, options) => toStream.source(self.catPullStream(ipfsPath, options));
};
