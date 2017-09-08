const {
    database: { pouch }
} = adone;

const {
    plugin: { find: plugin },
} = pouch;

const {
    util: { upsert }
} = adone.private(pouch);

const {
    adapter: {
        local: { abstractMapper }
    }
} = plugin;

export default function deleteIndex(db, index) {

    if (!index.ddoc) {
        throw new Error("you must supply an index.ddoc when deleting");
    }

    if (!index.name) {
        throw new Error("you must supply an index.name when deleting");
    }

    const docId = index.ddoc;
    const viewName = index.name;

    const deltaFun = (doc) => {
        if (Object.keys(doc.views).length === 1 && doc.views[viewName]) {
            // only one view in this ddoc, delete the whole ddoc
            return { _id: docId, _deleted: true };
        }
        // more than one view here, just remove the view
        delete doc.views[viewName];
        return doc;
    };

    return upsert(db, docId, deltaFun).then(() => {
        return abstractMapper.viewCleanup.apply(db);
    }).then(() => {
        return { ok: true };
    });
}
