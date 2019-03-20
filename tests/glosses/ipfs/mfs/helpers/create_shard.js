const {
    multiformat: { CID },
    ipfs: { unixfsImporter },
    stream: { pull }
} = adone;
const { values, collect } = pull;

const createShard = (ipld, files, shardSplitThreshold = 10) => {
    return new Promise((resolve, reject) => {
        pull(
            values(files),
            unixfsImporter(ipld, {
                shardSplitThreshold,
                reduceSingleLeafToSelf: false, // same as go-ipfs-mfs implementation, differs from `ipfs add`(!)
                leafType: "raw" // same as go-ipfs-mfs implementation, differs from `ipfs add`(!)
            }),
            collect((err, files) => {
                if (err) {
                    return reject(err);
                }

                const dir = files[files.length - 1];

                resolve(new CID(dir.multihash));
            })
        );
    });
};

module.exports = createShard;
