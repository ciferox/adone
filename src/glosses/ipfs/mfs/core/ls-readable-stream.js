const lsPullStream = require("./ls-pull-stream");

const {
    stream: { pull }
} = adone;
const { pullStreamToStream } = pull;

module.exports = (context) => {
    return function mfsLsReadableStream(path, options = {}) {
        return pullStreamToStream.source(lsPullStream(context)(path, options));
    };
};
