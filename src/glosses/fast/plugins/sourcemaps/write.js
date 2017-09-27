export default function plugin({ __ }) {
    const { is, x, util } = adone;
    return function write(destPath, options) {
        if (is.undefined(options) && !is.string(destPath)) {
            options = destPath;
            destPath = undefined;
        }
        options = Object.assign({
            includeContent: true,
            addComment: true,
            charset: "utf8"
        }, options);

        const internals = __.write(destPath, options);

        return this.throughSync(function (file) {
            if (file.isNull() || !file.sourceMap) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            // fix paths if Windows style paths
            file.sourceMap.file = util.normalizePath(file.relative);

            internals.setSourceRoot(file);
            internals.loadContent(file);
            internals.mapSources(file);
            internals.mapDestPath(file, this);

            this.push(file);
        });
    };
}
