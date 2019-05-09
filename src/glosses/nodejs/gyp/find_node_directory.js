const path = require("path");

module.exports = function findNodeDirectory(scriptLocation, processObj) {
    // set dirname and process if not passed in
    // this facilitates regression tests
    if (is.undefined(scriptLocation)) {
        scriptLocation = __dirname;
    }
    if (is.undefined(processObj)) {
        processObj = process;
    }

    // Have a look to see what is above us, to try and work out where we are
    npm_parent_directory = path.join(scriptLocation, "../../../..");
    node_root_dir = "";

    if (path.basename(npm_parent_directory) === "deps") {
    // We are in a build directory where this script lives in
    // deps/npm/node_modules/node-gyp/lib
        node_root_dir = path.join(npm_parent_directory, "..");
    } else if (path.basename(npm_parent_directory) === "node_modules") {
    // We are in a node install directory where this script lives in
    // lib/node_modules/npm/node_modules/node-gyp/lib or
    // node_modules/npm/node_modules/node-gyp/lib depending on the
    // platform
        if (processObj.platform === "win32") {
            node_root_dir = path.join(npm_parent_directory, "..");
        } else {
            node_root_dir = path.join(npm_parent_directory, "../..");
        }
    } else {
    // We don't know where we are, try working it out from the location
    // of the node binary
        const node_dir = path.dirname(processObj.execPath);
        const directory_up = path.basename(node_dir);
        if (directory_up === "bin") {
            node_root_dir = path.join(node_dir, "..");
        } else if (directory_up === "Release" || directory_up === "Debug") {
            // If we are a recently built node, and the directory structure
            // is that of a repository. If we are on Windows then we only need
            // to go one level up, everything else, two
            if (processObj.platform === "win32") {
                node_root_dir = path.join(node_dir, "..");
            } else {
                node_root_dir = path.join(node_dir, "../..");
            }
        }
    // Else return the default blank, "".
    }
    return node_root_dir;
};
