const Source = require("../defer/source");
const error = require("../pull/sources/error");
const values = require("../pull/sources/values");
const collect = require("../pull/sinks/collect");

module.exports = function (compare) {
    const source = Source();

    const sink = collect((err, ary) => {
        if (err) {
            return source.resolve(error(err));
        }

        source.resolve(values(ary.sort(compare)));
    });

    return function (read) {
        sink(read);
        return source;
    };
};
