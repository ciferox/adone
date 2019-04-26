const {
    path
} = adone;

// get drive on windows
export const getRootPath = (p) => {
    p = path.normalize(path.resolve(p)).split(path.sep);
    if (p.length > 0) {
        return p[0];
    }
    return null;
};

// http://stackoverflow.com/a/62888/10333 contains more accurate
// TODO: expand to include the rest
const INVALID_PATH_CHARS = /[<>:"|?*]/;

export const invalidWin32Path = (p) => {
    const rp = getRootPath(p);
    p = p.replace(rp, "");
    return INVALID_PATH_CHARS.test(p);
};
