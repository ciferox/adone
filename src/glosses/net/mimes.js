const { is, std: { path: { extname } }, util } = adone;

const db = new Map(util.entries(adone.loadAsset("glosses/net/mimes.json")));

const EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
const TEXT_TYPE_REGEXP = /^text\//i;

export const extensions = new Map();
export const types = new Map();

{
    // source preference (least -> most)
    const preference = ["nginx", "apache", undefined, "iana"];

    for (const [type, mime] of db.entries()) {
        const exts = mime.extensions;
        if (!exts || !exts.length) {
            continue;
        }
        extensions.set(type, exts);
        // extension -> mime
        for (const extension of exts) {
            if (types.has(extension)) {
                const from = preference.indexOf(db.get(types.get(extension)).source);
                const to = preference.indexOf(mime.source);

                if (types.get(extension) !== "application/octet-stream" &&
                    (from > to || (from === to && types.get(extension).startsWith("application/")))) {
                    // skip the remapping
                    continue;
                }
            }

            // set the extension -> mime
            types.set(extension, type);
        }
    }
}

// Get the default charset for a MIME type.
export const charset = (type) => {
    if (!type || !is.string(type)) {
        return false;
    }

    // TODO: use media-typer
    const match = EXTRACT_TYPE_REGEXP.exec(type);
    const mime = match && db.get(match[1].toLowerCase());

    if (mime && mime.charset) {
        return mime.charset;
    }

    // default text/* to utf-8
    if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
    }

    return false;
};

// Lookup the MIME type for a file path/extension.
export const lookup = (path) => {
    if (!path || !is.string(path)) {
        return false;
    }

    // get the extension ("ext" or ".ext" or full path)
    const extension = extname(`x.${path}`).toLowerCase().substr(1);

    if (!extension) {
        return false;
    }

    if (!types.has(extension)) {
        return false;
    }
    return types.get(extension);
};

// Create a full Content-Type header given a MIME type or extension.
export const contentType = (str) => {
    // TODO: should this even be in this module?
    if (!str || !is.string(str)) {
        return false;
    }

    let mime = !str.includes("/") ? lookup(str) : str;

    if (!mime) {
        return false;
    }

    // TODO: use content-type or other module
    if (!mime.includes("charset")) {
        const cset = charset(mime);
        if (cset) {
            mime += `; charset=${cset.toLowerCase()}`;
        }
    }

    return mime;
};

// Get the default extension for a MIME type.
export const extension = (type) => {
    if (!type || !is.string(type)) {
        return false;
    }

    // TODO: use media-typer
    const match = EXTRACT_TYPE_REGEXP.exec(type);

    // get extensions
    const exts = match && extensions.get(match[1].toLowerCase());

    if (!exts || !exts.length) {
        return false;
    }

    return exts[0];
};
