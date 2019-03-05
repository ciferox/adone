const {
    stream: { pull2: pull }
} = adone;
const { split, stringify } = pull;

exports = module.exports;

exports.parse = () => {
    return pull(
        split("\n"),
        pull.filter(),
        pull.map(JSON.parse)
    );
};

exports.serialize = stringify.ldjson;
