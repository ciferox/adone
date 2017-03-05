import adone from "adone";
import initInternals from "./internals";

const { is, x, Transform } = adone;

export default function write(destPath, options) {
    if (is.undefined(options) && !is.string(destPath)) {
        options = destPath;
        destPath = undefined;
    }
    options = adone.o({
        includeContent: true,
        addComment: true,
        charset: "utf8"
    }, options);

    const internals = initInternals(destPath, options);

    return new Transform({
        transform(file) {
            if (file.isNull() || !file.sourceMap) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            // fix paths if Windows style paths
            file.sourceMap.file = adone.util.unixifyPath(file.relative);

            internals.setSourceRoot(file);
            internals.loadContent(file);
            internals.mapSources(file);
            internals.mapDestPath(file, this);

            this.push(file);
        }
    })
}
