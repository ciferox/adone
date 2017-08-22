
// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
// the diffFun tells us what delta to apply to the doc.  it either returns
// the doc, or false if it doesn't need to do an update after all
const tryAndPut = (db, doc, diffFun) => {
    return db.put(doc).then((res) => {
        return {
            updated: true,
            rev: res.rev
        };
    }, (err) => {
        /* istanbul ignore next */
        if (err.status !== 409) {
            throw err;
        }
        return upsert(db, doc._id, diffFun);
    });
};

export default function upsert(db, docId, diffFun) {
    return new Promise((fulfill, reject) => {
        db.get(docId, (err, doc) => {
            if (err) {
                /* istanbul ignore next */
                if (err.status !== 404) {
                    return reject(err);
                }
                doc = {};
            }

            // the user might change the _rev, so save it for posterity
            const docRev = doc._rev;
            const newDoc = diffFun(doc);

            if (!newDoc) {
                // if the diffFun returns falsy, we short-circuit as
                // an optimization
                return fulfill({ updated: false, rev: docRev });
            }

            // users aren't allowed to modify these values,
            // so reset them here
            newDoc._id = docId;
            newDoc._rev = docRev;
            fulfill(tryAndPut(db, newDoc, diffFun));
        });
    });
}
