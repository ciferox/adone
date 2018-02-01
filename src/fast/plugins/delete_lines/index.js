export default function plugin() {
    const {
        exception,
        util,
        text
    } = adone;

    return function deleteLines(filters) {
        filters = util.arrify(filters);

        return this.throughSync(function (file) {
            if (file.isStream()) {
                throw new exception.NotSupported("delete-lines: streams are unsuppored");
            }

            if (!file.isNull()) {
                const newLines = [];

                for (const line of text.splitLines(file.contents.toString())) {
                    let matched = false;
                    for (const filter of filters) {
                        if (line.match(filter)) {
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        newLines.push(line);
                    }
                }

                file.contents = Buffer.from(newLines.join(""));
            }
            this.push(file);
        });
    };
}
