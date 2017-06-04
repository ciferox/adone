const { lazify, x, util: { toposort }, fast: { Fast } } = adone;

const lazy = lazify({
    findDependencies: ["./util", (x) => x.findDependencies]
}, null, require);


const isDependecyUsedInAnyDeclaration = (dependency, ngDeps) => {
    if (!ngDeps.modules) {
        return false;
    }
    if (dependency in ngDeps.modules) {
        return true;
    }
    return Object.keys(ngDeps.modules).some((module) => {
        return ngDeps.modules[module].indexOf(dependency) > -1;
    });
};

export default function angularFilesort() {
    const files = [];
    const ngModules = {};
    const toSort = [];

    return new Fast(null, {
        transform(file) {
            // Fail on empty files
            if (file.isNull()) {
                throw new x.InvalidArgument(`File: ${file.relative} without content. You have to read it.`);
            }

            // Streams not supported
            if (file.isStream()) {
                /* jshint validthis:true */
                throw new x.NotSupported("Streaming is not supported");
            }

            let deps;
            try {
                deps = lazy.findDependencies(file.contents.toString());
            } catch (err) {
                throw new x.Exception(`Error in parsing ${file.relative}: ${err.message}`);
            }

            // Store references to each file with a declaration:
            for (const name of Object.keys(deps.modules)) {
                ngModules[name] = file;
            }

            // Add each file with dependencies to the array to sort:
            for (const dep of deps.dependencies) {
                if (isDependecyUsedInAnyDeclaration(dep, deps)) {
                    continue;
                }
                if (dep === "ng") {
                    continue;
                }
                toSort.push([file, dep]);
            }

            files.push(file);
        },
        flush() {
            // Convert all module names to actual files with declarations:
            for (let i = 0; i < toSort.length; i++) {
                const moduleName = toSort[i][1];
                const declarationFile = ngModules[moduleName];
                if (declarationFile) {
                    toSort[i][1] = declarationFile;
                } else {
                    // Depending on module outside stream (possibly a 3rd party one),
                    // don't care when sorting:
                    toSort.splice(i--, 1);
                }
            }

            // Sort files alphabetically first to prevent random reordering.
            // Reverse sorting as it is reversed later on.
            files.sort((a, b) => {
                if (a.path.toLowerCase().replace(a.extname, "") < b.path.toLowerCase().replace(b.extname, "")) {
                    return 1;
                }
                if (a.path.toLowerCase().replace(a.extname, "") > b.path.toLowerCase().replace(b.extname, "")) {
                    return -1;
                }
                return 0;
            });
            // Sort `files` with `toSort` as dependency tree:
            for (const file of toposort.array(files, toSort).reverse()) {
                this.push(file);
            }
        }
    });
}
