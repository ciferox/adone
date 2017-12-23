const sources = require("./sources");
const sinks = require("./sinks");
const throughs = require("./throughs");

exports = module.exports = require("./pull");

exports.pull = exports;

for (var k in sources) {
    exports[k] = sources[k];
}

for (var k in throughs) {
    exports[k] = throughs[k];
}

for (var k in sinks) {
    exports[k] = sinks[k];
}

adone.lazify({
    many: "./many",
    defer: "./defer",
    handshake: "./handshake",
    reader: "./reader",
    pushable: "./pushable",
    lengthPrefixed: "./length_prefixed",
    fromStream: "./from_stream",
    toStream: "./to_stream",
    catch: "./catch",
    ws: "./ws",
    cat: "./cat",
    pair: "./pair",
    peek: "./peek",
    generate: "./generate",
    file: "./file",
    endable: "./endable",
    goodbye: "./goodbye",
    utf8decoder: "./utf8_decoder",
    serializer: "./serializer",
    abortable: "./abortable",
    hang: "./hang",
    block: "./block",
    transform: "./transform",
    zip: "./zip",
    paramap: "./paramap",
    sort: "./sort",
    split: "./split"
}, exports, require);
