const {
    database: { pouch }
} = adone;

const {
    collate: { collate },
    util: {
        md5: { binary: binaryMd5 }
    }
} = adone.private(pouch);

const sortObjectPropertiesByKey = (queryParams) => {
    return Object.keys(queryParams).sort(collate).reduce((result, key) => {
        result[key] = queryParams[key];
        return result;
    }, {});
};

// Generate a unique id particular to this replication.
// Not guaranteed to align perfectly with CouchDB's rep ids.
export default function generateReplicationId(src, target, opts) {
    const docIds = opts.doc_ids ? opts.doc_ids.sort(collate) : "";
    const filterFun = opts.filter ? opts.filter.toString() : "";
    let queryParams = "";
    let filterViewName = "";
    let selector = "";

    // possibility for checkpoints to be lost here as behaviour of
    // JSON.stringify is not stable (see #6226)
    /* istanbul ignore if */
    if (opts.selector) {
        selector = JSON.stringify(opts.selector);
    }

    if (opts.filter && opts.query_params) {
        queryParams = JSON.stringify(sortObjectPropertiesByKey(opts.query_params));
    }

    if (opts.filter && opts.filter === "_view") {
        filterViewName = opts.view.toString();
    }

    return Promise.all([src.id(), target.id()]).then((res) => {
        const queryData = res[0] + res[1] + filterFun + filterViewName +
            queryParams + docIds + selector;
        return new Promise(((resolve) => {
            binaryMd5(queryData, resolve);
        }));
    }).then((md5sum) => {
        // can't use straight-up md5 alphabet, because
        // the char '/' is interpreted as being for attachments,
        // and + is also not url-safe
        md5sum = md5sum.replace(/\//g, ".").replace(/\+/g, "_");
        return `_local/${md5sum}`;
    });
}
