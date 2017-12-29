const generateStream = () => {
    let stream = null;

    const process = function (chunk, enc, cb) {
        let packet = adone.EMPTY_BUFFER;

        try {
            packet = adone.net.mqtt.packet.generate(chunk);
        } catch (err) {
            this.emit("error", err);
            return;
        }

        this.push(packet);
        cb();
    };
    stream = adone.stream.through.obj(process);

    return stream;
};

export default generateStream;
