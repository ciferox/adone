const { is, std: { path }, fast: { Fast } } = adone;

const includeParents = (dirs, options) => {
    let topLevels;
    let bottomLevels = 0;
    const topPath = [];
    const bottomPath = [];

    if (is.array(options)) {
        topLevels = Math.abs(options[0]);
        bottomLevels = Math.abs(options[1]);
    } else if (options >= 0) {
        topLevels = options;
    } else {
        bottomLevels = Math.abs(options);
    }

    if (topLevels + bottomLevels > dirs.length) {
        return dirs;
    }

    while (topLevels > 0) {
        topPath.push(dirs.shift());
        topLevels--;
    }
    while (bottomLevels > 0) {
        bottomPath.unshift(dirs.pop());
        bottomLevels--;
    }
    return topPath.concat(bottomPath);
};

const subPath = (dirs, options) => {
    if (is.array(options)) {
        return dirs.slice(options[0], options[1]);
    }
    return dirs.slice(options);

};

const flattenPath = (file, options) => {
    const fileName = path.basename(file.path);
    let dirs;

    if (!options.includeParents && !options.subPath) {
        return fileName;
    }

    dirs = path.dirname(file.relative).split(path.sep);
    if (options.includeParents) {
        dirs = includeParents(dirs, options.includeParents);
    }
    if (options.subPath) {
        dirs = subPath(dirs, options.subPath);
    }

    dirs.push(fileName);
    return path.join(...dirs);
};

export default function flatten(options = {}) {
    options.newPath = options.newPath || "";
    return new Fast(null, {
        transform(file) {
            if (!file.isDirectory()) {
                file.path = path.join(file.base, options.newPath, flattenPath(file, options));
                this.push(file);
            }
        }
    });
}

flatten.flattenPath = flattenPath;
