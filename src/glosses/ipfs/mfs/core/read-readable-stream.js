const readPullStream = require("./read-pull-stream");

const {
    stream: { pull2: pull }
} = adone;
const { pullStreamToStream } = pull;

module.exports = (context) => {
    return function mfsReadReadableStream(path, options = {}) {
        return pullStreamToStream.source(readPullStream(context)(path, options));
    };
};
