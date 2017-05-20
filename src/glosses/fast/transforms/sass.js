// @flow


import SASS from "node-sass";

const { std: { path }, x, is, fast: { Fast, File, helpers: { applySourceMap } } } = adone;


export default function (options = {}) {
    return new Fast(null, {
        async transform(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            if (file.basename.indexOf("_") === 0) {
                return;
            }

            if (!file.contents.length) {
                file.extname = ".css";
                this.push(file);
                return;
            }


            const opts = Object.create(options);
            opts.data = file.contents.toString();

            // we set the file path here so that libsass can correctly resolve import paths
            opts.file = file.path;

            // Ensure `indentedSyntax` is true if a `.sass` file
            if (file.extname === ".sass") {
                opts.indentedSyntax = true;
            }

            // Ensure file's parent directory in the include path
            if (opts.includePaths) {
                if (is.string(opts.includePaths) === "string") {
                    opts.includePaths = [opts.includePaths];
                }
            } else {
                opts.includePaths = [];
            }

            opts.includePaths.unshift(file.dirname);

            // Generate Source Maps if plugin source-map present
            if (file.sourceMap) {
                opts.sourceMap = file.path;
                opts.omitSourceMapUrl = true;
                opts.sourceMapContents = true;
            }
            const sassObj = await new Promise((resolve, reject) => {
                SASS.render(opts, (err, sassObj) => {
                    err ? reject(err) : resolve(sassObj);
                });
            }).catch((err) => {
                const filePath = err.file === "stdin" ? file.path : err.file;
                const relativePath = path.relative(file.cwd, filePath);
                err.messageOriginal = err.message; 
                err.message = `${relativePath}\n${err.formatted}`;
                err.relativePath = relativePath;
                throw err;
            });
            let sassMap;
            let sassFileSrc;

            // Build Source Maps!
            if (sassObj.map) {
                // Transform map into JSON
                sassMap = JSON.parse(sassObj.map.toString());
                // Grab the stdout and transform it into stdin
                const sassMapFile = sassMap.file.replace(/^stdout$/, "stdin");
                // Grab the base file name that's being worked on
                sassFileSrc = file.relative;
                // Grab the path portion of the file that's being worked on
                const sassFileSrcPath = path.dirname(sassFileSrc);
                if (sassFileSrcPath) {
                    //Prepend the path to all files in the sources array except the file that's being worked on
                    const sourceFileIndex = sassMap.sources.indexOf(sassMapFile);
                    sassMap.sources = sassMap.sources.map((source, index) => {
                        return (index === sourceFileIndex) ? source : path.join(sassFileSrcPath, source);
                    });
                }

                // Remove 'stdin' from souces and replace with filenames!
                sassMap.sources = sassMap.sources.filter((src) => {
                    if (src !== "stdin") {
                        return src;
                    }
                });

                // Replace the map file with the original file name (but new extension)
                const t = new File({ path: sassFileSrc });
                t.extname = ".css";
                sassMap.file = t.path;
                // Apply the map
                applySourceMap(file, sassMap);
            }

            file.contents = sassObj.css;
            file.extname = ".css";
            this.push(file);
        }
    });
}
