const {
    is,
    std
} = adone;

const normalizeExt = (ext) => {
    if (ext.startsWith(".")) {
        return ext.substr(1);
    }
    return ext;
};

export default function globize(path, { ext, recursive = false } = {}) {
    if (is.glob(path)) {
        return path;
    } else if (is.nil(path)) {
        path = "";
    } else if (is.array(path)) {
        const result = [];
        for (const p of path) {
            result.push(globize(p, { ext, recursive }));
        }
        return result;
    } else if (!is.string(path)) {
        throw new adone.error.InvalidArgument("Invalid value of path");
    }

    let exts;

    if (is.string(ext)) {
        exts = `.${normalizeExt(ext)}`;
    } else if (is.array(ext)) {
        const normalized = [];
        for (const e of ext) {
            normalized.push(normalizeExt(e));
        }
        exts = `.+(${normalized.join("|")})`;
    } else {
        exts = "";
    }

    return recursive ? std.path.join(path, "**", `*${exts}`) : std.path.join(path, `*${exts}`);
}
