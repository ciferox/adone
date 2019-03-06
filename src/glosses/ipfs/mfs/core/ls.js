const {
    FILE_SEPARATOR
} = require("./utils");
const lsPullStream = require("./ls-pull-stream");

const {
    is,
    stream: { pull2: pull }
} = adone;
const { collect } = pull;

module.exports = (context) => {
    return function mfsLs(path, options, callback) {
        if (is.function(path)) {
            callback = path;
            path = FILE_SEPARATOR;
            options = {};
        }

        if (is.function(options)) {
            callback = options;
            options = {};
        }

        pull(
            lsPullStream(context)(path, options),
            collect(callback)
        );
    };
};
