const {
    p2p: { stream: { pull, split, stringify } }
} = adone;

exports = module.exports;

exports.parse = () => {
    return pull(
        split("\n"),
        pull.filter(),
        pull.map(JSON.parse)
    );
};

exports.serialize = stringify.ldjson;
