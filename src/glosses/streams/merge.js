const {
    is,
    std: { stream: { PassThrough } }
} = adone;

export default function (...streams) {
    let sources = [];
    const output = new PassThrough({ objectMode: true });

    output.setMaxListeners(0);

    const remove = (source) => {
        sources = sources.filter((it) => {
            return it !== source;
        });
        if (!sources.length && output.readable) {
            output.end();
        }
    }

    const add = output.add = function (source) {
        if (is.array(source)) {
            source.forEach(add);
            return this;
        }

        sources.push(source);
        source.once("end", () => remove(source));
        source.once("error", output.emit.bind(output, "error"));
        source.pipe(output, { end: false });
        return this;
    };
    output.isEmpty = function () {
        return sources.length === 0;
    };

    output.on("unpipe", remove);

    Array.prototype.slice.call(streams).forEach(add);

    return output;
}
