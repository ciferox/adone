adone.lazify({
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
    newlineCounter: "./newline_counter"
}, exports, require);
