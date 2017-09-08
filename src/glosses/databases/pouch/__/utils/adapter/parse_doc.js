const {
    database: { pouch }
} = adone;

const {
    x: { DOC_VALIDATION, INVALID_REV, createError }
} = pouch;

const {
    util: {
        uuid,
        rev,
        invalidIdError
    }
} = adone.private(pouch);

const toObject = (array) => {
    return array.reduce((obj, item) => {
        obj[item] = true;
        return obj;
    }, {});
};
// List of top level reserved words for doc
const reservedWords = toObject([
    "_id",
    "_rev",
    "_attachments",
    "_deleted",
    "_revisions",
    "_revs_info",
    "_conflicts",
    "_deleted_conflicts",
    "_local_seq",
    "_rev_tree",
    //replication documents
    "_replication_id",
    "_replication_state",
    "_replication_state_time",
    "_replication_state_reason",
    "_replication_stats",
    // Specific to Couchbase Sync Gateway
    "_removed"
]);

// List of reserved words that should end up the document
const dataWords = toObject([
    "_attachments",
    //replication documents
    "_replication_id",
    "_replication_state",
    "_replication_state_time",
    "_replication_state_reason",
    "_replication_stats"
]);

const parseRevisionInfo = (rev) => {
    if (!/^\d+\-./.test(rev)) {
        return createError(INVALID_REV);
    }
    const idx = rev.indexOf("-");
    const left = rev.substring(0, idx);
    const right = rev.substring(idx + 1);
    return {
        prefix: parseInt(left, 10),
        id: right
    };
};

const makeRevTreeFromRevisions = (revisions, opts) => {
    const pos = revisions.start - revisions.ids.length + 1;

    const revisionIds = revisions.ids;
    let ids = [revisionIds[0], opts, []];

    for (let i = 1, len = revisionIds.length; i < len; i++) {
        ids = [revisionIds[i], { status: "missing" }, [ids]];
    }

    return [{
        pos,
        ids
    }];
};

// Preprocess documents, parse their revisions, assign an id and a
// revision for new writes that are missing them, etc
export default function parseDoc(doc, newEdits) {
    let nRevNum;
    let newRevId;
    let revInfo;
    const opts = { status: "available" };
    if (doc._deleted) {
        opts.deleted = true;
    }

    if (newEdits) {
        if (!doc._id) {
            doc._id = uuid();
        }
        newRevId = rev();
        if (doc._rev) {
            revInfo = parseRevisionInfo(doc._rev);
            if (revInfo.error) {
                return revInfo;
            }
            doc._rev_tree = [{
                pos: revInfo.prefix,
                ids: [revInfo.id, { status: "missing" }, [[newRevId, opts, []]]]
            }];
            nRevNum = revInfo.prefix + 1;
        } else {
            doc._rev_tree = [{
                pos: 1,
                ids: [newRevId, opts, []]
            }];
            nRevNum = 1;
        }
    } else {
        if (doc._revisions) {
            doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
            nRevNum = doc._revisions.start;
            newRevId = doc._revisions.ids[0];
        }
        if (!doc._rev_tree) {
            revInfo = parseRevisionInfo(doc._rev);
            if (revInfo.error) {
                return revInfo;
            }
            nRevNum = revInfo.prefix;
            newRevId = revInfo.id;
            doc._rev_tree = [{
                pos: nRevNum,
                ids: [newRevId, opts, []]
            }];
        }
    }

    invalidIdError(doc._id);

    doc._rev = `${nRevNum}-${newRevId}`;

    const result = { metadata: {}, data: {} };
    for (const key in doc) {
        /* istanbul ignore else */
        if (Object.prototype.hasOwnProperty.call(doc, key)) {
            const specialKey = key[0] === "_";
            if (specialKey && !reservedWords[key]) {
                const error = createError(DOC_VALIDATION, key);
                error.message = `${DOC_VALIDATION.message}: ${key}`;
                throw error;
            } else if (specialKey && !dataWords[key]) {
                result.metadata[key.slice(1)] = doc[key];
            } else {
                result.data[key] = doc[key];
            }
        }
    }
    return result;
}
