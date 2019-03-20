const readPullStream = require("./read-pull-stream");

const {
    is,
    stream: { pull }
} = adone;
const { collect } = pull;

module.exports = (context) => {
    return function mfsRead(path, options, callback) {
        if (is.function(options)) {
            callback = options;
            options = {};
        }

        pull(
            readPullStream(context)(path, options),
            collect((error, buffers) => {
                if (error) {
                    return callback(error);
                }

                return callback(null, Buffer.concat(buffers));
            })
        );
    };
};
