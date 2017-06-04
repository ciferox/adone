export default function deleteLines(filters) {
    const { x, util, text, fast: { Fast } } = adone;

    filters = util.arrify(filters);

    return new Fast(null, {
        transform(file) {
            if (file.isStream()) {
                throw new x.NotSupported("delete-lines: streams are unsuppored");
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
        }
    });
}
