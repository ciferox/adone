const BPromise = require("bluebird");

const {
    stream: { concat }
} = adone;

const redirectsTo = function (/* opt_status, path */) {
    const args = Array.prototype.slice.call(arguments);
    return function (req, res) {
        res.redirect.apply(res, args);
    };
};

const sendsJson = function (json) {
    return function (req, res) {
        res.json(json);
    };
};

const concatJson = function (resolve, reject) {
    return function (res) {
        res.pipe(concat.create({ encoding: "string" }, (string) => {
            try {
                res.parsedJson = JSON.parse(string);
                resolve(res);
            } catch (err) {
                reject(new Error(`error parsing ${JSON.stringify(string)}\n caused by: ${err.message}`));
            }
        })).on("error", reject);
    };
};

const asPromise = function (cb) {
    return function (result) {
        return new BPromise((resolve, reject) => {
            cb(resolve, reject, result);
        });
    };
};

module.exports = {
    redirectsTo,
    sendsJson,
    concatJson,
    asPromise
};
