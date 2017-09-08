const {
    util,
    database: { pouch }
} = adone;

const {
    plugin: { find: plugin },
} = pouch;

const {
    util: {
        md5: { string: stringMd5 },
        upsert
    }
} = adone.private(pouch);

const {
    adapter: {
        local: {
            abstractMapper,
            util: {
                validateIndex,
                massageIndexDef
            }
        }
    }
} = plugin;

export default function createIndex(db, requestDef) {
    requestDef = plugin.massageCreateIndexRequest(requestDef);
    const originalIndexDef = util.clone(requestDef.index);
    requestDef.index = massageIndexDef(requestDef.index);

    validateIndex(requestDef.index);

    // calculating md5 is expensive - memoize and only
    // run if required
    let md5;
    const getMd5 = () => {
        return md5 || (md5 = stringMd5(JSON.stringify(requestDef)));
    };

    const viewName = requestDef.name || (`idx-${getMd5()}`);

    const ddocName = requestDef.ddoc || (`idx-${getMd5()}`);
    const ddocId = `_design/${ddocName}`;

    let hasInvalidLanguage = false;
    let viewExists = false;

    const updateDdoc = (doc) => {
        if (doc._rev && doc.language !== "query") {
            hasInvalidLanguage = true;
        }
        doc.language = "query";
        doc.views = doc.views || {};

        viewExists = Boolean(doc.views[viewName]);

        if (viewExists) {
            return false;
        }

        doc.views[viewName] = {
            map: {
                fields: adone.o(...requestDef.index.fields)
            },
            reduce: "_count",
            options: {
                def: originalIndexDef
            }
        };

        return doc;
    };

    db.constructor.emit("debug", ["find", "creating index", ddocId]);

    return upsert(db, ddocId, updateDdoc).then(() => {
        if (hasInvalidLanguage) {
            throw new Error(`invalid language for ddoc with id "${
                ddocId
            }" (should be "query")`);
        }
    }).then(() => {
        // kick off a build
        // TODO: abstract-pouchdb-mapreduce should support auto-updating
        // TODO: should also use update_after, but pouchdb/pouchdb#3415 blocks me
        const signature = `${ddocName}/${viewName}`;
        return abstractMapper.query.call(db, signature, {
            limit: 0,
            reduce: false
        }).then(() => {
            return {
                id: ddocId,
                name: viewName,
                result: viewExists ? "exists" : "created"
            };
        });
    });
}
