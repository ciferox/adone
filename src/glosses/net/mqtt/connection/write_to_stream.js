const generateStream = (output) => {
    const write = function (chunk, enc, cb) {
        if (adone.net.mqtt.packet.writeToStream(chunk, output)) {
            cb();
        } else {
            output.once("drain", cb);
        }
    };

    const input = new adone.std.stream.Writable({
        objectMode: true,
        write
    });

    return input;
};

export default generateStream;
