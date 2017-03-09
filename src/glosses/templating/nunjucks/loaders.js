import adone from "adone";
const { EventEmitter, std: { path, fs }, is } = adone;

export class Loader extends EventEmitter {
    resolve(from, to) {
        return path.resolve(path.dirname(from), to);
    }

    isRelative(filename) {
        return filename[0] === "." && (filename[1] === "/" || (filename[1] === "." && filename[2] === "/"));
    }
}


export class FileSystemLoader extends Loader {
    constructor(searchPaths, opts = {}) {
        super();

        this.pathsToNames = {};
        this.noCache = Boolean(opts.noCache);

        if (searchPaths) {
            searchPaths = is.array(searchPaths) ? searchPaths : [searchPaths];
            // For windows, convert to forward slashes
            this.searchPaths = searchPaths.map(path.normalize);
        } else {
            this.searchPaths = ["."];
        }

        if (opts.watch) {
            // Watch all the templates in the paths and fire an event when
            // they change
            const paths = this.searchPaths.filter(fs.existsSync);
            const watcher = adone.FSWatcher.watch(paths);
            const _this = this;
            watcher.on("all", (event, fullname) => {
                fullname = path.resolve(fullname);
                if (event === "change" && fullname in _this.pathsToNames) {
                    _this.emit("update", _this.pathsToNames[fullname]);
                }
            });
            watcher.on("error", (error) => {
                adone.error(`Watcher error: ${error}`);
            });
        }
    }

    getSource(name) {
        let fullpath = null;
        const paths = this.searchPaths;

        for (let i = 0; i < paths.length; i++) {
            const basePath = path.resolve(paths[i]);
            const p = path.resolve(paths[i], name);

            // Only allow the current directory and anything
            // underneath it to be searched
            if (p.indexOf(basePath) === 0 && fs.existsSync(p)) {
                fullpath = p;
                break;
            }
        }

        if (!fullpath) {
            return null;
        }

        this.pathsToNames[fullpath] = name;

        return {
            src: fs.readFileSync(fullpath, "utf-8"),
            path: fullpath,
            noCache: this.noCache
        };
    }
}

export class PrecompiledLoader extends Loader {
    constructor(compiledTemplates = {}) {
        super();
        this.precompiled = compiledTemplates;
    }

    getSource(name) {
        if (this.precompiled[name]) {
            return {
                src: {
                    type: "code",
                    obj: this.precompiled[name]
                },
                path: name
            };
        }
        return null;
    }
}

