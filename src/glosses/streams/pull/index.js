const {
    is
} = adone;

const core = function (a) {
    const length = arguments.length;
    if (is.function(a) && a.length === 1) {
        let args = new Array(length);
        for (let i = 0; i < length; i++) {
            args[i] = arguments[i];
        }
        return function (read) {
            if (is.nil(args)) {
                throw new TypeError("partial sink should only be called once!");
            }

            // Grab the reference after the check, because it's always an array now
            // (engines like that kind of consistency).
            const ref = args;
            args = null;

            // Prioritize common case of small number of pulls.
            switch (length) {
                case 1: return core(read, ref[0]);
                case 2: return core(read, ref[0], ref[1]);
                case 3: return core(read, ref[0], ref[1], ref[2]);
                case 4: return core(read, ref[0], ref[1], ref[2], ref[3]);
                default:
                    ref.unshift(read);
                    return core.apply(null, ref);
            }
        };
    }

    let read = a;

    if (read && is.function(read.source)) {
        read = read.source;
    }

    for (let i = 1; i < length; i++) {
        const s = arguments[i];
        if (is.function(s)) {
            read = s(read);
        } else if (s && typeof s === "object") {
            s.sink(read);
            read = s.source;
        }
    }

    return read;
};

adone.lazify({
    // sources
    keys: "./sources/keys",
    once: "./sources/once",
    values: "./sources/values",
    count: "./sources/count",
    infinite: "./sources/infinite",
    empty: "./sources/empty",
    error: "./sources/error",

    // sinks
    drain: "./sinks/drain",
    onEnd: "./sinks/on_end",
    log: "./sinks/log",
    find: "./sinks/find",
    reduce: "./sinks/reduce",
    collect: "./sinks/collect",
    concat: "./sinks/concat",

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

    abortable: "./abortable",
    batch: "./batch",
    cat: "./cat",
    catch: "./catch",
    defer: "./defer",
    file: "./file",
    utf8Decoder: "./utf8_decoder",
    generate: "./generate",
    handshake: "./handshake",
    ndjson: "./ndjson",
    through2: "./through2", // pull-through
    split: "./split",
    stringify: "./stringify",
    pushable: "./pushable",
    reader: "./reader",
    pair: "./pair",
    lengthPrefixed: "./length_prefixed",
    paramap: "./paramap",
    pause: "./pause",
    protocolBuffers: "./protocol_buffers",
    sort: "./sort",
    pullStreamToStream: "./pull_stream_to_stream",
    streamToPullStream: "./stream_to_pull_stream",
    asyncIteratorToPullStream: "./async_iterator_to_pull_stream",
    pullStreamToAsyncIterator: "./pull_stream_to_async_iterator",
    traverse: "./traverse",
    write: "./write",
    ws: "./ws",
    socketioPullStream: "./socketio_pull_stream",
    is: "./is",
    peek: "./peek",
    hang: "./hang",
    block: "./block",
    jsonDoubleline: "./json_doubleline",
    goodbye: "./goodbye",
    serializer: "./serializer",
    many: "./many",
    pullToStream: "./pull_to_stream"
}, core, require);

export default adone.asNamespace(core);
