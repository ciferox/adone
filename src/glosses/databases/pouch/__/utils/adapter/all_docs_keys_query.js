const {
    is
} = adone;

export default function allDocsKeysQuery(api, opts) {
    const keys = opts.keys;
    const finalResults = {
        offset: opts.skip
    };
    return Promise.all(keys.map((key) => {
        const subOpts = Object.assign({ key, deleted: "ok" }, opts);
        ["limit", "skip", "keys"].forEach((optKey) => {
            delete subOpts[optKey];
        });
        return new Promise(((resolve, reject) => {
            api._allDocs(subOpts, (err, res) => {
                /* istanbul ignore if */
                if (err) {
                    return reject(err);
                }
                /* istanbul ignore if */
                if (opts.update_seq && !is.undefined(res.update_seq)) {
                    finalResults.update_seq = res.update_seq;
                }
                finalResults.total_rows = res.total_rows;
                resolve(res.rows[0] || { key, error: "not_found" });
            });
        }));
    })).then((results) => {
        finalResults.rows = results;
        return finalResults;
    });
}

