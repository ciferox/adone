

const { fast: { Fast } } = adone;

export default (filters) => {
    if (!adone.is.array(filters)) {
        filters = adone.util.arrify(filters);
    }
    
    return new Fast(null, {
        transform(file) {
            if (file.isStream()) {
                throw new adone.x.NotSupported("delete-lines: streams are unsuppored");
            }

            if (!file.isNull()) {
                const newLines = [];

                for (const line of adone.text.splitLines(file.contents.toString())) {
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

                file.contents = new Buffer(newLines.join(""));
            }
            this.push(file);
        }
    });
};
