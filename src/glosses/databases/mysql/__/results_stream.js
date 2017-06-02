const { std: { stream: { Readable } } } = adone;

export default function resultsStream(command, connectionStream) {
    command.stream = function (options) {
        let stream;

        options = options || {};
        options.objectMode = true;
        stream = new Readable(options),

            stream._read = () => {
                connectionStream.resume();
            };

        this.on("result", (row, i) => {
            if (!stream.push(row)) {
                connectionStream.pause();
            }
            stream.emit("result", row, i);  // replicate old emitter
        });

        this.on("error", (err) => {
            stream.emit("error", err);  // Pass on any errors
        });

        this.on("end", () => {
            stream.push(null);  // pushing null, indicating EOF
        });

        this.on("fields", (fields, i) => {
            stream.emit("fields", fields, i);  // replicate old emitter
        });

        return stream;
    };
}
