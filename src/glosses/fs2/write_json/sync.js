import stringify from "./stringify";

const {
    fs2
} = adone;
const { base } = fs2;

export default (file, obj, options) => {
    options = options || {};
    const fs = options.fs || base;

    const str = stringify(obj, options);
    // not sure if fs.writeFileSync returns anything, but just in case
    return fs.writeFileSync(file, str, options);
};
