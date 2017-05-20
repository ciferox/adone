

const { fast: { Fast } } = adone;

function includeParents(dirs, options) {
    let topLevels;
    let bottomLevels = 0;
    const topPath = [];
    const bottomPath = [];

    if (adone.is.array(options)) {
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
}

function subPath(dirs, options) {
    if (adone.is.array(options)) {
        return dirs.slice(options[0], options[1]);
    } 
    return dirs.slice(options);
    
}

/**
* Flatten the path to the desired depth
*
* @param {File} file - vinyl file
* @param {Object} options
* @return {String}
*/
function flattenPath(file, options) {
    const fileName = adone.std.path.basename(file.path);
    let dirs;

    if (!options.includeParents && !options.subPath) {
        return fileName;
    }

    dirs = adone.std.path.dirname(file.relative).split(adone.std.path.sep);
    if (options.includeParents) {
        dirs = includeParents(dirs, options.includeParents);
    }
    if (options.subPath) {
        dirs = subPath(dirs, options.subPath);
    }

    dirs.push(fileName);
    return adone.std.path.join(...dirs);
}

class Flatten extends adone.Transform {
    constructor(options) {
        super();
        this.options = options || {};
        this.options.newPath = this.options.newPath || "";
    }
    _transform(file) {
        if (!file.isDirectory()) {
            file.path = adone.std.path.join(file.base, this.options.newPath, flattenPath(file, this.options));
            this.push(file);
        }
    }
}

export { flattenPath };
export default (options = {}) => {
    options.newPath = options.newPath || "";
    return new Fast(null, {
        transform(file) {
            if (!file.isDirectory()) {
                file.path = adone.std.path.join(file.base, options.newPath, flattenPath(file, options));
                this.push(file);
            }
        }
    });
};
