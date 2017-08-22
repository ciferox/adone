const { is, util, database: { pouch: { __, plugin: { find: plugin } } } } = adone;
const {
    util: {
        selector: {
            compare
        }
    }
} = __;
const {
    adapter: {
        local: {
            util: {
                massageIndexDef
            }
        }
    }
} = plugin;

export default function getIndexes(db) {
    // just search through all the design docs and filter in-memory.
    // hopefully there aren't that many ddocs.
    return db.allDocs({
        startkey: "_design/",
        endkey: "_design/\uffff",
        include_docs: true
    }).then((allDocsRes) => {
        const res = {
            indexes: [{
                ddoc: null,
                name: "_all_docs",
                type: "special",
                def: {
                    fields: [{ _id: "asc" }]
                }
            }]
        };

        res.indexes = util.flatten([res.indexes, allDocsRes.rows.filter((row) => {
            return row.doc.language === "query";
        }).map((row) => {
            const viewNames = !is.undefined(row.doc.views) ? Object.keys(row.doc.views) : [];

            return viewNames.map((viewName) => {
                const view = row.doc.views[viewName];
                return {
                    ddoc: row.id,
                    name: viewName,
                    type: "json",
                    def: massageIndexDef(view.options.def)
                };
            });
        })], { depth: Infinity });

        // these are sorted by view name for some reason
        res.indexes.sort((left, right) => {
            return compare(left.name, right.name);
        });
        res.total_rows = res.indexes.length;
        return res;
    });
}
