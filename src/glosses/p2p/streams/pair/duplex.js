
const Pair = require("./");
module.exports = function () {
    const a = Pair();
    const b = Pair();
    return [
        {
            source: a.source,
            sink: b.sink
        },
        {
            source: b.source,
            sink: a.sink
        }
    ];
};
