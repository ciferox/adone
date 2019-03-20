/* eslint-disable func-style */
const {
    stream: { pull }
} = adone;
const { cat, values, filter, map } = pull;

// Logic to export a unixfs directory.
module.exports = dirExporter;

function dirExporter(cid, node, name, path, pathRest, resolve, dag, parent, depth, options) {
    const accepts = pathRest[0];

    const dir = {
        name,
        depth,
        path,
        cid,
        size: 0,
        type: "dir"
    };

    // we are at the max depth so no need to descend into children
    if (options.maxDepth && options.maxDepth <= depth) {
        return values([dir]);
    }

    const streams = [
        pull(
            values(node.links),
            filter((item) => accepts === undefined || item.name === accepts),
            map((link) => ({
                depth: depth + 1,
                size: 0,
                name: link.name,
                path: path + "/" + link.name,
                cid: link.cid,
                linkName: link.name,
                pathRest: pathRest.slice(1),
                type: "dir"
            })),
            resolve
        )
    ];

    // place dir before if not specifying subtree
    if (!pathRest.length || options.fullPath) {
        streams.unshift(values([dir]));
    }

    return cat(streams);
}
