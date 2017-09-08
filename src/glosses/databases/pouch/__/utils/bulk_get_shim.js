const {
    util
} = adone;

// Most browsers throttle concurrent requests at 6, so it's silly
// to shim _bulk_get by trying to launch potentially hundreds of requests
// and then letting the majority time out. We can handle this ourselves.
const MAX_NUM_CONCURRENT_REQUESTS = 6;

const identityFunction = (x) => {
    return x;
};

const formatResultForOpenRevsGet = (result) => {
    return [{
        ok: result
    }];
};

// shim for P/CouchDB adapters that don't directly implement _bulk_get
export default function bulkGet(db, opts, callback) {
    const requests = opts.docs;

    // consolidate into one request per doc if possible
    const requestsById = new Map();
    requests.forEach((request) => {
        if (requestsById.has(request.id)) {
            requestsById.get(request.id).push(request);
        } else {
            requestsById.set(request.id, [request]);
        }
    });

    const numDocs = requestsById.size;
    let numDone = 0;
    const perDocResults = new Array(numDocs);

    const collapseResultsAndFinish = () => {
        const results = [];
        perDocResults.forEach((res) => {
            res.docs.forEach((info) => {
                results.push({
                    id: res.id,
                    docs: [info]
                });
            });
        });
        callback(null, { results });
    };

    const checkDone = () => {
        if (++numDone === numDocs) {
            collapseResultsAndFinish();
        }
    };

    const gotResult = (docIndex, id, docs) => {
        perDocResults[docIndex] = { id, docs };
        checkDone();
    };

    const allRequests = [];
    requestsById.forEach((value, key) => {
        allRequests.push(key);
    });

    let i = 0;

    const nextBatch = () => {

        if (i >= allRequests.length) {
            return;
        }

        const upTo = Math.min(i + MAX_NUM_CONCURRENT_REQUESTS, allRequests.length);
        const batch = allRequests.slice(i, upTo);
        processBatch(batch, i);
        i += batch.length;
    };

    const processBatch = (batch, offset) => {
        batch.forEach((docId, j) => {
            const docIdx = offset + j;
            const docRequests = requestsById.get(docId);

            // just use the first request as the "template"
            // TODO: The _bulk_get API allows for more subtle use cases than this,
            // but for now it is unlikely that there will be a mix of different
            // "atts_since" or "attachments" in the same request, since it's just
            // replicate.js that is using this for the moment.
            // Also, atts_since is aspirational, since we don't support it yet.
            const docOpts = util.pick(docRequests[0], ["atts_since", "attachments"]);
            docOpts.open_revs = docRequests.map((request) => {
                // rev is optional, open_revs disallowed
                return request.rev;
            });

            // remove falsey / undefined revisions
            docOpts.open_revs = docOpts.open_revs.filter(identityFunction);

            let formatResult = identityFunction;

            if (docOpts.open_revs.length === 0) {
                delete docOpts.open_revs;

                // when fetching only the "winning" leaf,
                // transform the result so it looks like an open_revs
                // request
                formatResult = formatResultForOpenRevsGet;
            }

            // globally-supplied options
            ["revs", "attachments", "binary", "latest"].forEach((param) => {
                if (param in opts) {
                    docOpts[param] = opts[param];
                }
            });
            db.get(docId, docOpts, (err, res) => {
                let result;
                /* istanbul ignore if */
                if (err) {
                    result = [{ error: err }];
                } else {
                    result = formatResult(res);
                }
                gotResult(docIdx, docId, result);
                nextBatch();
            });
        });
    };

    nextBatch();
}
