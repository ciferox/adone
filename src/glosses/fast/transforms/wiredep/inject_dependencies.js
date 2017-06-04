const { fs, is, std: { path } } = adone;

let config;
let fileTypes;
let globalDependenciesSorted;
let ignorePath;

const replaceIncludes = (file, fileType, returnType) => {
    return (match, startBlock, spacing, blockType, oldScripts, endBlock, offset, string) => {
        blockType = blockType || "js";

        let newFileContents = startBlock;
        const dependencies = globalDependenciesSorted[blockType] || [];
        let quoteMark = "";

        (string.substr(0, offset) + string.substr(offset + match.length)).
            replace(oldScripts, "").
            replace(fileType.block, "").
            replace(fileType.detect[blockType], (match) => {
                quoteMark = match.match(/['"]/) && match.match(/['"]/)[0];
            });

        if (!quoteMark) {
            // What the heck. Check if there's anything in the oldScripts block.
            match.replace(fileType.detect[blockType], (match) => {
                quoteMark = match.match(/['"]/) && match.match(/['"]/)[0];
            });
        }

        spacing = returnType + spacing.replace(/\r|\n/g, "");

        dependencies.
            map((filePath) => {
                return path.join(
                    path.relative(path.dirname(file), path.dirname(filePath)),
                    path.basename(filePath)
                ).replace(/\\/g, "/").replace(ignorePath, "");
            }).
            forEach((filePath) => {
                if (is.function(fileType.replace[blockType])) {
                    newFileContents += spacing + fileType.replace[blockType](filePath);
                } else if (is.string(fileType.replace[blockType])) {
                    newFileContents += spacing + fileType.replace[blockType].replace("{{filePath}}", filePath);
                }
                if (quoteMark) {
                    newFileContents = newFileContents.replace(/"/g, quoteMark);
                }
                config.get("on-path-injected")({
                    block: blockType,
                    file,
                    path: filePath
                });
            });

        return newFileContents + spacing + endBlock;
    };
};


const injectScripts = async (filePath) => {
    let contents = await fs.readFile(filePath);
    contents = String(contents);
    const fileExt = path.extname(filePath).substr(1);
    const fileType = fileTypes[fileExt] || fileTypes.default;
    const returnType = /\r\n/.test(contents) ? "\r\n" : "\n";

    const newContents = contents.replace(
        fileType.block,
        replaceIncludes(filePath, fileType, returnType)
    );

    if (contents !== newContents) {
        await fs.writeFile(filePath, newContents);
        config.get("on-file-updated")(filePath);
    }
};


const injectScriptsStream = (filePath, contents, fileExt) => {
    const returnType = /\r\n/.test(contents) ? "\r\n" : "\n";
    const fileType = fileTypes[fileExt] || fileTypes.default;

    const newContents = contents.replace(
        fileType.block,
        replaceIncludes(filePath, fileType, returnType)
    );

    config.get("on-file-updated")(filePath);

    return newContents;
};

const injectDependencies = async (globalConfig) => {
    config = globalConfig;
    const stream = config.get("stream");

    globalDependenciesSorted = config.get("global-dependencies-sorted");
    ignorePath = config.get("ignore-path");
    fileTypes = config.get("file-types");

    if (stream.src) {
        config.set("stream", {
            src: injectScriptsStream(stream.path, stream.src, stream.fileType),
            fileType: stream.fileType
        });
    } else {
        for (const source of config.get("src")) {
            await injectScripts(source);
        }
    }

    return config;
};

export default injectDependencies;
