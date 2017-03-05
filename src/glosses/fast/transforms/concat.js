// @flow

import adone from "adone";

const {  is, std: { path }, x, fast: { File, Fast, helpers: { Concat } } } = adone;

export default function (file, options = {}) {
    if (!file) {
        throw new x.InvalidArgument("Missing file option");
    }
    // to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
    if (!is.string(options.newLine)) {
        options.newLine = "\n";
    }

    let isUsingSourceMaps = false;
    let latestFile;
    let latestMod;
    let fileName;
    let concat;

    if (is.string(file)) {
        fileName = file;
    } else if (is.string(file.path)) {
        fileName = path.basename(file.path);
    } else {
        throw new adone.x.InvalidArgument("Missing path in file options");
    }

    return new Fast(null, {
        transform: (file) => {
            if (file.isNull()) {
                return;
            }
            if (file.isStream()) {
                throw new adone.x.NotSupported("Streaming is not supported");
            }

            // enable sourcemap support for concat
            // if a sourcemap initialized file comes in
            if (file.sourceMap && isUsingSourceMaps === false) {
                isUsingSourceMaps = true;
            }
            // set latest file if not already set,
            // or if the current file was modified more recently.
            if (!latestMod || file.stat && file.stat.mtime > latestMod) {
                latestFile = file;
                latestMod = file.stat && file.stat.mtime;
            }

            // construct concat instance
            if (!concat) {
                concat = new Concat(isUsingSourceMaps, fileName, options.newLine);
            }

            // add file to concat instance
            concat.add(file.relative, file.contents, file.sourceMap);
        },
        flush() {
            // no files passed in, no file goes out
            if (!latestFile || !concat) {
                return;
            }
            let joinedFile;
            // if file options was a file path
            // clone everything from the latest file
            if (is.string(file)) {
                joinedFile = latestFile.clone({ contents: false });
                joinedFile.path = path.join(latestFile.base, file);
            } else {
                joinedFile = new File(file);
            }
            joinedFile.contents = concat.content;

            if (concat.sourceMapping) {
                joinedFile.sourceMap = JSON.parse(concat.sourceMap);
            }

            this.push(joinedFile);
        }
    });
}
