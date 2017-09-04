const stream = adone.lazify({
    buffer: () => adone.lazify({
        DEFAULT_INITIAL_SIZE: ["./buffer_stream", (mod) => mod.DEFAULT_INITIAL_SIZE],
        DEFAULT_INCREMENT_AMOUNT: ["./buffer_stream", (mod) => mod.DEFAULT_INCREMENT_AMOUNT],
        DEFAULT_FREQUENCY: ["./buffer_stream", (mod) => mod.DEFAULT_FREQUENCY],
        DEFAULT_CHUNK_SIZE: ["./buffer_stream", (mod) => mod.DEFAULT_CHUNK_SIZE],
        ReadableStream: ["./buffer_stream", (mod) => mod.ReadableStream],
        WritableStream: ["./buffer_stream", (mod) => mod.WritableStream]
    }, null, require),
    ConcatStream: "./concat_stream",
    concat: () => (opts) => new adone.stream.ConcatStream(opts),
    MuteStream: "./mute_stream",
    iconv: "./iconv",
    CountingStream: "./counting_stream",
    newlineCounter: "./newline_counter",
    as: "./as",
    base64: "./base64",
    LastNewline: "./last_newline",
    Duplexify: "./duplexify",
    eos: "./eos",
    shift: "./shift",
    through: "./through",
    replace: "./replace",
    CoreStream: "./core"
}, adone.asNamespace(exports), require);

// must be a function, not an arrow function
export const core = function (source, options) {
    return new stream.CoreStream(source, options);
};

adone.lazify({
    merge: () => stream.CoreStream.merge
}, core);
