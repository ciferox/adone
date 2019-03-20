
const Source = require("./source");
const Sink = require("./sink");

module.exports = function () {

    const source = Source();
    const sink = Sink();

    return {
        source,
        sink,
        resolve(duplex) {
            source.resolve(duplex.source);
            sink.resolve(duplex.sink);

        }
    };


};
