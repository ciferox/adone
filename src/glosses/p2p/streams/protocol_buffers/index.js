const pro = require("./pull");

const {
    p2p: { stream: { pull, lengthPrefixed: lp } }
} = adone;

module.exports.encode = (proto) => {
    return pull(
        pro.encode(proto),
        lp.encode()
    );
};

module.exports.decode = (proto) => {
    return pull(
        lp.decode(),
        pro.decode(proto)
    );
};

module.exports.pull = pro;
