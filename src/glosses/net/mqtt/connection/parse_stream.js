const parseStream = () => {
    let stream = null;
    const parser = new adone.net.mqtt.packet.Parser();

    const process = function (chunk, enc, cb) {
        parser.parse(chunk);
        cb();
    };

    stream = adone.stream.through.obj(process);

    parser.on("packet", (packet) => {
        stream.push(packet);
    });
    parser.on("error", stream.emit.bind(stream, "error"));

    return stream;
};

export default parseStream;
