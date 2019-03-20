const {
    stream: { pull },
    multiformat: { CID }
} = adone;
const { values, error } = pull;

module.exports = (cid, node, name, path, pathRest, resolve, size, dag, parent, depth) => {
    let newNode
    if (pathRest.length) {
        const pathElem = pathRest[0]
        newNode = node[pathElem]
        const newName = path + '/' + pathElem
        if (!newNode) {
            return error(new Error(`not found`))
        }

        const isCID = CID.isCID(newNode)

        return pull(
            values([{
                depth: depth,
                name: pathElem,
                path: newName,
                pathRest: pathRest.slice(1),
                multihash: isCID && newNode,
                object: !isCID && newNode,
                parent: parent
            }]),
            resolve)
    } else {
        return error(new Error('invalid node type'))
    }
}
