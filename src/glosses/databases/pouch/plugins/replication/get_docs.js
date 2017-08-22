const { util, database: { pouch: { __: { util: { isRemote } } } } } = adone;

const isGenOne = (rev) => {
    return /^1-/.test(rev);
};

const fileHasChanged = (localDoc, remoteDoc, filename) => {
    return !localDoc._attachments ||
        !localDoc._attachments[filename] ||
        localDoc._attachments[filename].digest !== remoteDoc._attachments[filename].digest;
};

const getDocAttachments = (db, doc) => {
    const filenames = Object.keys(doc._attachments);
    return Promise.all(filenames.map((filename) => {
        return db.getAttachment(doc._id, filename, { rev: doc._rev });
    }));
};

const getDocAttachmentsFromTargetOrSource = (target, src, doc) => {
    const doCheckForLocalAttachments = isRemote(src) && !isRemote(target);
    const filenames = Object.keys(doc._attachments);

    if (!doCheckForLocalAttachments) {
        return getDocAttachments(src, doc);
    }

    return target.get(doc._id).then((localDoc) => {
        return Promise.all(filenames.map((filename) => {
            if (fileHasChanged(localDoc, doc, filename)) {
                return src.getAttachment(doc._id, filename);
            }

            return target.getAttachment(localDoc._id, filename);
        }));
    }).catch((error) => {
        /* istanbul ignore if */
        if (error.status !== 404) {
            throw error;
        }

        return getDocAttachments(src, doc);
    });
};

const createBulkGetOpts = (diffs) => {
    const requests = [];
    Object.keys(diffs).forEach((id) => {
        const missingRevs = diffs[id].missing;
        missingRevs.forEach((missingRev) => {
            requests.push({
                id,
                rev: missingRev
            });
        });
    });

    return {
        docs: requests,
        revs: true,
        latest: true
    };
};

//
// Fetch all the documents from the src as described in the "diffs",
// which is a mapping of docs IDs to revisions. If the state ever
// changes to "cancelled", then the returned promise will be rejected.
// Else it will be resolved with a list of fetched documents.
//
export default function getDocs(src, target, diffs, state) {
    diffs = util.clone(diffs); // we do not need to modify this

    let resultDocs = [];
    let ok = true;

    const getAllDocs = () => {

        const bulkGetOpts = createBulkGetOpts(diffs);

        if (!bulkGetOpts.docs.length) { // optimization: skip empty requests
            return;
        }

        return src.bulkGet(bulkGetOpts).then((bulkGetResponse) => {
            /* istanbul ignore if */
            if (state.cancelled) {
                throw new Error("cancelled");
            }
            return Promise.all(bulkGetResponse.results.map((bulkGetInfo) => {
                return Promise.all(bulkGetInfo.docs.map((doc) => {
                    const remoteDoc = doc.ok;

                    if (doc.error) {
                        // when AUTO_COMPACTION is set, docs can be returned which look
                        // like this: {"missing":"1-7c3ac256b693c462af8442f992b83696"}
                        ok = false;
                    }

                    if (!remoteDoc || !remoteDoc._attachments) {
                        return remoteDoc;
                    }

                    return getDocAttachmentsFromTargetOrSource(target, src, remoteDoc)
                        .then((attachments) => {
                            const filenames = Object.keys(remoteDoc._attachments);
                            attachments
                                .forEach((attachment, i) => {
                                    const att = remoteDoc._attachments[filenames[i]];
                                    delete att.stub;
                                    delete att.length;
                                    att.data = attachment;
                                });

                            return remoteDoc;
                        });
                }));
            }))

                .then((results) => {
                    resultDocs = resultDocs.concat(util.flatten(results).filter(Boolean));
                });
        });
    };

    const hasAttachments = (doc) => {
        return doc._attachments && Object.keys(doc._attachments).length > 0;
    };

    const hasConflicts = (doc) => {
        return doc._conflicts && doc._conflicts.length > 0;
    };

    const fetchRevisionOneDocs = (ids) => {
        // Optimization: fetch gen-1 docs and attachments in
        // a single request using _all_docs
        return src.allDocs({
            keys: ids,
            include_docs: true,
            conflicts: true
        }).then((res) => {
            if (state.cancelled) {
                throw new Error("cancelled");
            }
            res.rows.forEach((row) => {
                if (row.deleted || !row.doc || !isGenOne(row.value.rev) ||
                    hasAttachments(row.doc) || hasConflicts(row.doc)) {
                    // if any of these conditions apply, we need to fetch using get()
                    return;
                }

                // strip _conflicts array to appease CSG (#5793)
                /* istanbul ignore if */
                if (row.doc._conflicts) {
                    delete row.doc._conflicts;
                }

                // the doc we got back from allDocs() is sufficient
                resultDocs.push(row.doc);
                delete diffs[row.id];
            });
        });
    };

    const getRevisionOneDocs = () => {
        // filter out the generation 1 docs and get them
        // leaving the non-generation one docs to be got otherwise
        const ids = Object.keys(diffs).filter((id) => {
            const missing = diffs[id].missing;
            return missing.length === 1 && isGenOne(missing[0]);
        });
        if (ids.length > 0) {
            return fetchRevisionOneDocs(ids);
        }
    };

    const returnResult = () => {
        return { ok, docs: resultDocs };
    };

    return Promise.resolve()
        .then(getRevisionOneDocs)
        .then(getAllDocs)
        .then(returnResult);
}
