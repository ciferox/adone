const {
    util
} = adone;
// we restucture the supplied JSON considerably, because the official
// Mango API is very particular about a lot of this stuff, but we like
// to be liberal with what we accept in order to prevent mental
// breakdowns in our users
export default function massageCreateIndexRequest(requestDef) {
    requestDef = util.clone(requestDef);

    if (!requestDef.index) {
        requestDef.index = {};
    }

    ["type", "name", "ddoc"].forEach((key) => {
        if (requestDef.index[key]) {
            requestDef[key] = requestDef.index[key];
            delete requestDef.index[key];
        }
    });

    if (requestDef.fields) {
        requestDef.index.fields = requestDef.fields;
        delete requestDef.fields;
    }

    if (!requestDef.type) {
        requestDef.type = "json";
    }
    return requestDef;
}
