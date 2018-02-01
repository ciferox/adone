export default function plugin() {
    const { is, std: { path }, exception, fast: { File } } = adone;

    const { Concat } = adone.private(adone.fast);

    return function concat(file, options = {}) {

        if (!file) {
            throw new exception.InvalidArgument("Missing file option");
        }
        // to preserve existing |undefined| behaviour and to introduce |newLine: ""| for binaries
        if (!is.string(options.newLine)) {
            options.newLine = "\n";
        }

        let isUsingSourceMaps = false;
        let latestFile;
        let latestMod;
        let fileName;
        let data;

        if (is.string(file)) {
            fileName = file;
        } else if (is.string(file.path)) {
            fileName = path.basename(file.path);
        } else {
            throw new exception.InvalidArgument("Missing path in file options");
        }

        return this.throughSync((file) => {
            if (file.isNull()) {
                return;
            }
            if (file.isStream()) {
                throw new exception.NotSupported("Streaming is not supported");
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
            if (!data) {
                data = new Concat(isUsingSourceMaps, fileName, options.newLine);
            }

            // add file to concat instance
            data.add(file.relative, file.contents, file.sourceMap);
        }, function () {
            // no files passed in, no file goes out
            if (!latestFile || !data) {
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
            joinedFile.contents = data.content;

            if (data.sourceMapping) {
                joinedFile.sourceMap = JSON.parse(data.sourceMap);
            }

            this.push(joinedFile);
        });
    };
}
