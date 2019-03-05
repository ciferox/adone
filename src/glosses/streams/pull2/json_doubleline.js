const {
    stream: { pull2: pull }
} = adone;
const { filter, map, stringify, split, is } = pull;

const parse = function () {
    return pull(
        split("\n\n"),
        filter(), // filter empty lines
        map(JSON.parse)
    );
};

const duplex = function (stream) {
    return {
        source: pull(stream.source, stringify()),
        sink: pull(parse(), stream.sink)
    };
};

exports = module.exports = function (stream) {
    return (
        is.source(stream) ? pull(stream, parse())
            : is.sink(stream) ? pull(stringify(), stream)
                : duplex(stream)
    );
};

exports.stringify = stringify;
exports.parse = parse;
