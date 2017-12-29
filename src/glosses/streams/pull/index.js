import pull from "./pull";

adone.lazify({
    // sinks
    drain: "./sinks/drain",
    onEnd: "./sinks/on_end",
    log: "./sinks/log",
    find: "./sinks/find",
    reduce: "./sinks/reduce",
    collect: "./sinks/collect",
    concat: "./sinks/concat",

    // sources
    keys: "./sources/keys",
    once: "./sources/once",
    values: "./sources/values",
    count: "./sources/count",
    infinite: "./sources/infinite",
    empty: "./sources/empty",
    error: "./sources/error",

    // throughs
    map: "./throughs/map",
    asyncMap: "./throughs/async_map",
    filter: "./throughs/filter",
    filterNot: "./throughs/filter_not",
    through: "./throughs/through",
    take: "./throughs/take",
    unique: "./throughs/unique",
    nonUnique: "./throughs/non_unique",
    flatten: "./throughs/flatten",

    //
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
}, pull, require);

export default pull;
