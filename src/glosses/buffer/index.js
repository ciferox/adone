adone.lazify({
    Buffer: () => {
        return (adone.is.nodejs) 
            ? adone.std.buffer.Buffer
            : require("./buffer").Buffer;
    },
    SmartBuffer: "./smart_buffer"
}, adone.asNamespace(exports), require);

