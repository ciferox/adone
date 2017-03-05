import adone from "adone";
import initInternals from "./internals";

const { x, Transform, is } = adone;

export default function init(options = {}) {
    return new Transform({
        transform(file) {
            // pass through if file is null or already has a source map
            if (file.isNull() || file.sourceMap) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }

            let fileContent = file.contents.toString();
            let sourceMap;
            let preExistingComment;
            const internals = initInternals(options, file, fileContent);

            if (options.loadMaps) {
                const result = internals.loadMaps();
                sourceMap = result.map;
                fileContent = result.content;
                preExistingComment = result.preExistingComment;
            }

            if (!sourceMap && options.identityMap) {
                const fileType = file.extname;
                const source = adone.util.unixifyPath(file.relative);
                const generator = new adone.js.sourceMap.SourceMapGenerator({ file: source });

                if (fileType === ".js") {
                    const tokens = adone.js.compiler.parse(fileContent).tokens;
                    for (const token of tokens) {
                        if (token.type.label === "eof") {
                            break;
                        }
                        const mapping = {
                            original: token.loc.start,
                            generated: token.loc.start,
                            source
                        };
                        if (token.type.label === "name") {
                            mapping.name = token.value;
                        }
                        generator.addMapping(mapping);
                    }
                    generator.setSourceContent(source, fileContent);
                    sourceMap = generator.toJSON();
                } else if (fileType === ".css") {
                    // TOOD
                }
            }

            if (!sourceMap) {
                // Make an empty source map
                sourceMap = {
                    version: 3,
                    names: [],
                    mappings: "",
                    sources: [adone.util.unixifyPath(file.relative)],
                    sourcesContent: [fileContent]
                };
            } else if (!is.null(preExistingComment) && !is.undefined(preExistingComment))
                sourceMap.preExistingComment = preExistingComment;

            sourceMap.file = adone.util.unixifyPath(file.relative);
            file.sourceMap = sourceMap;

            this.push(file);
        }
    });
}
