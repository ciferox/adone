const {
    stream: { pull }
} = adone;
const { take, collect, generate } = pull;

const { srcPath } = require("../helpers");

const randomByteStream = require("./random_byte_stream");
const chunker = require(srcPath("chunker/fixed-size"));

const REPEATABLE_CHUNK_SIZE = 300000;

module.exports = function (maxSize, seed) {
    const chunks = Math.ceil(maxSize / REPEATABLE_CHUNK_SIZE);
    return pull(
        generate(0, generator),
        take(chunks)
    );

    function generator(iteration, cb) {
        if (iteration === 0) {
            pull(
                randomByteStream(seed),
                chunker(REPEATABLE_CHUNK_SIZE),
                take(1),
                collect((err, results) => {
                    const result = results[0];
                    cb(err, result, result);
                })
            );
        } else {
            cb(null, iteration, iteration);
        }
    }
};
