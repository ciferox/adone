// @flow



class ETransform extends adone.Transform {
    _end() {
        this.emit("ending");
        return super._end();
    }
}

export default function (condition, trueStream = null, falseStream = null) {
    if (!trueStream && !falseStream) {
        throw new adone.x.InvalidArgument("You must provide at least one stream");
    }
    const input = new ETransform({
        transform: async (x) => {
            const stream = await condition(x) ? trueStream : falseStream;
            if (!stream) {
                input.push(x);
            } else if (!stream.write(x)) {
                input.pause();
                stream.once("drain", () => input.resume());
            }
        },
        flush: () => outputEnd
    });
    input.once("ending", () => {
        trueStream && trueStream.end();
        falseStream && falseStream.end();
    });

    for (const stream of [trueStream, falseStream]) {
        if (!stream) {
            continue;
        }
        stream.on("data", (x) => {
            if (!input.push(x)) {
                stream.pause();
                input.once("drain", () => stream.resume());
            }
        });
        if (stream.paused) {
            process.nextTick(() => stream.resume());
        }
    }

    const outputEnd = Promise.all([
        trueStream && new Promise((resolve) => trueStream.once("end", resolve)),
        falseStream && new Promise((resolve) => falseStream.once("end", resolve))
    ]);
    return input;
}
