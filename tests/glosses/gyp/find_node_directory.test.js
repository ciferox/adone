const path = require("path");
const { gyp: { command: { configure: { test: { findNodeDirectory } } } } } = adone;

const platforms = ["darwin", "freebsd", "linux", "sunos", "win32", "aix"];

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in a build tree where npm is installed in
// .... /deps/npm
it("test find-node-directory - node install", () => {
    for (let next = 0; next < platforms.length; next++) {
        const processObj = { execPath: "/x/y/bin/node", platform: platforms[next] };
        assert.equal(
            findNodeDirectory("/x/deps/npm/node_modules/node-gyp/lib", processObj),
            path.join("/x"));
    }
});

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in an installed tree where npm is installed in
// .... /lib/node_modules/npm or .../node_modules/npm
// depending on the patform
it("test find-node-directory - node build", () => {
    for (let next = 0; next < platforms.length; next++) {
        const processObj = { execPath: "/x/y/bin/node", platform: platforms[next] };
        if (platforms[next] === "win32") {
            assert.equal(
                findNodeDirectory("/y/node_modules/npm/node_modules/node-gyp/lib",
                    processObj), path.join("/y"));
        } else {
            assert.equal(
                findNodeDirectory("/y/lib/node_modules/npm/node_modules/node-gyp/lib",
                    processObj), path.join("/y"));
        }
    }
});

// we should find the directory based on the execPath
// for node and match because it was in the bin directory
it("test find-node-directory - node in bin directory", () => {
    for (let next = 0; next < platforms.length; next++) {
        const processObj = { execPath: "/x/y/bin/node", platform: platforms[next] };
        assert.equal(
            findNodeDirectory("/nothere/npm/node_modules/node-gyp/lib", processObj),
            path.join("/x/y"));
    }
});

// we should find the directory based on the execPath
// for node and match because it was in the Release directory
it("test find-node-directory - node in build release dir", () => {
    for (let next = 0; next < platforms.length; next++) {
        let processObj;
        if (platforms[next] === "win32") {
            processObj = { execPath: "/x/y/Release/node", platform: platforms[next] };
        } else {
            processObj = {
                execPath: "/x/y/out/Release/node",
                platform: platforms[next]
            };
        }

        assert.equal(
            findNodeDirectory("/nothere/npm/node_modules/node-gyp/lib", processObj),
            path.join("/x/y"));
    }
});

// we should find the directory based on the execPath
// for node and match because it was in the Debug directory
it("test find-node-directory - node in Debug release dir", () => {
    for (let next = 0; next < platforms.length; next++) {
        let processObj;
        if (platforms[next] === "win32") {
            processObj = { execPath: "/a/b/Debug/node", platform: platforms[next] };
        } else {
            processObj = { execPath: "/a/b/out/Debug/node", platform: platforms[next] };
        }

        assert.equal(
            findNodeDirectory("/nothere/npm/node_modules/node-gyp/lib", processObj),
            path.join("/a/b"));
    }
});

// we should not find it as it will not match based on the execPath nor
// the directory from which the script is running
it("test find-node-directory - not found", () => {
    for (let next = 0; next < platforms.length; next++) {
        const processObj = { execPath: "/x/y/z/y", platform: next };
        assert.equal(findNodeDirectory("/a/b/c/d", processObj), "");
    }
});

// we should find the directory based on the directory
// the script is running in and it should match the layout
// in a build tree where npm is installed in
// .... /deps/npm
// same test as above but make sure additional directory entries
// don't cause an issue
it("test find-node-directory - node install", () => {
    for (let next = 0; next < platforms.length; next++) {
        const processObj = { execPath: "/x/y/bin/node", platform: platforms[next] };
        assert.equal(
            findNodeDirectory("/x/y/z/a/b/c/deps/npm/node_modules/node-gyp/lib",
                processObj), path.join("/x/y/z/a/b/c"));
    }
});
