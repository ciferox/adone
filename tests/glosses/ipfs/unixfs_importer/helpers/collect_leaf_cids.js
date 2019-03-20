const {
    multiformat: { CID },
    stream: { pull }
} = adone;
const { values, asyncMap, filter, flatten, collect, traverse } = pull;

module.exports = (ipld, multihash, callback) => {
    pull(
        traverse.depthFirst(new CID(multihash), (cid) => {
            return pull(
                values([cid]),
                asyncMap((cid, callback) => {
                    ipld.get(cid, (error, result) => {
                        callback(error, !error && result.value);
                    });
                }),
                asyncMap((node, callback) => {
                    if (!node.links) {
                        return callback();
                    }

                    return callback(
                        null, node.links.map((link) => link.cid)
                    );
                }),
                filter(Boolean),
                flatten()
            );
        }),
        collect(callback)
    );
};
