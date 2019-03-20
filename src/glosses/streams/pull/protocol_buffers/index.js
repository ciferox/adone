const pro = require("./pull");

const {
    stream: { pull }
} = adone;
const { lengthPrefixed } = pull;

module.exports.encode = (proto) => {
    return pull(
        pro.encode(proto),
        lengthPrefixed.encode()
    );
};

module.exports.decode = (proto) => {
    return pull(
        lengthPrefixed.decode(),
        pro.decode(proto)
    );
};

module.exports.pull = pro;
