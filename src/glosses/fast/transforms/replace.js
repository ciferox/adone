// @flow

import adone from "adone";

const { fast: { Fast } } = adone;

export default function (search, replacement) {
    let replacePairs = [];
    if (adone.is.array(search)) {
        if (!adone.is.array(replacement)) {
            throw new adone.x.InvalidArgument("If 'search' is an array, 'replacement' must be array too");
        }

        if (search.length !== replacement.length) {
            throw new adone.x.InvalidArgument("Arrays length should be equal");
        }

        for (let i = 0; i < search.length; ++i) {
            replacePairs.push([search[i], replacement[i]]);
        }
    } else if (adone.is.string(search) || adone.is.regexp(search)) {
        replacePairs = [[search, replacement]];
    } else if (adone.is.object(search)) {
        const replaceObj = search;
        search = adone.util.keys(replaceObj);

        for (let i = 0; i < search.length; ++i) {
            replacePairs.push([search[i], replaceObj[search[i]]]);
        }
    }

    replacePairs.sort((a, b) => b[0].length - a[0].length);

    return new Fast(null, {
        transform(file) {
            if (file.isNull()) {
                return this.push(file);
            }

            if (file.isStream()) {
                throw new adone.x.NotSupported("replace: streams are not supported");
                // file.contents = file.contents.pipe(rs(search, replacement));
                // return this.push(file);
            }

            if (file.isBuffer()) {
                let contents = String(file.contents);
                for (let i = 0; i < replacePairs.length; ++i) {
                    const [searchNow, replacementNow] = replacePairs[i];

                    if (adone.is.regexp(searchNow)) {
                        contents = contents.replace(searchNow, replacementNow);
                    } else {
                        const chunks = contents.split(searchNow);

                        let result;
                        if (adone.is.function(replacementNow)) {
                            // Start with the first chunk already in the result
                            // Replacements will be added thereafter
                            // This is done to avoid checking the value of i in the loop
                            result = [chunks[0]];

                            // The replacement function should be called once for each match
                            for (let i = 1; i < chunks.length; i++) {
                                // Add the replacement value
                                result.push(replacementNow(searchNow));

                                // Add the next chunk
                                result.push(chunks[i]);
                            }

                            result = result.join("");
                        } else {
                            result = chunks.join(replacementNow);
                        }

                        contents = result;
                    }
                }
                file.contents = new Buffer(contents);
                return this.push(file);
            }

            this.push(file);
        }
    });
}
