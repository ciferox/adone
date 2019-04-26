const {
    is,
    path: aPath,
    util,
    std,
    stream
} = adone;

const normalizeFilter = (filter) => {
    filter = util.arrify(filter);
    const functions = [];
    const other = [];
    for (const x of filter) {
        if (is.function(x)) {
            functions.push(x);
        } else {
            other.push(x);
        }
    }
    const matcher = adone.util.matchPath(other, null, { dot: true });
    return (x) => functions.some((y) => y(x)) || matcher(x.name); // cannot mix negate and other?
};

export default (fs) => {
    return (root, {
        fileFilter = adone.truly,
        directoryFilter = adone.truly,
        depth: maximumDepth = Infinity,
        files = true,
        directories = true,
        lstat = false
    } = {}) => {
        const fileEntries = Boolean(files);
        const directoryEntries = Boolean(directories);

        fileFilter = normalizeFilter(fileFilter);
        directoryFilter = normalizeFilter(directoryFilter);

        let resolvedRoot;
        let pending = 0;

        const source = stream.core.create().through(async function ([path, depth]) {
            --pending;
            const realPath = await fs.realpath(path);

            let relativePath;

            if (depth === 0) {
                resolvedRoot = realPath;
                relativePath = "";
            } else {
                relativePath = aPath.relative(resolvedRoot, realPath);
            }

            const files = await fs.readdir(path);
            const statMethod = lstat ? "lstat" : "stat";

            await Promise.all(files.map(async (name) => {
                const fullPath = aPath.join(realPath, name);
                const path = aPath.join(relativePath, name);
                const parentDir = relativePath;
                const fullParentDir = realPath;
                let stat;
                try {
                    stat = await fs[statMethod](fullPath);
                } catch (err) {
                    if (err.code === "ENOENT") {
                        // deleted
                        return;
                    }
                    throw err;
                }
                const entry = { name, fullPath, path, parentDir, fullParentDir, stat };
                if (stat.isDirectory()) {
                    if (directoryEntries && directoryFilter(entry)) {
                        this.push(entry);
                    }
                    if (depth < maximumDepth && directoryFilter(entry)) {
                        ++pending;
                        source.write([fullPath, depth + 1]);
                    }
                } else if (fileEntries && fileFilter(entry)) {
                    this.push(entry);
                }
            }));
            if (!pending) {
                source.end();
            }
        });
        fs.realpath(root).then((_resolvedRoot) => {
            resolvedRoot = _resolvedRoot;
            ++pending;
            source.write([resolvedRoot, 0]);
        }).catch((err) => {
            source.emit("error", err);
        });
        source.once("error", () => source.end());
        return source;
    };
};
