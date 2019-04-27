import { improve } from "./extra";

const ct = typeof (global.__custom_adone_fs__);
const customFs = (ct === "object")
    ? global.__custom_adone_fs__
    : ct === "function"
        ? global.__custom_adone_fs__()
        : null;

const base = customFs || require("./base").default;

const efs = adone.asNamespace(improve(base));
efs.base = base;
efs.improveFs = improve;

adone.lazify({
    custom: "./custom"
}, efs, require);

// export improved (extended and promisified) version of base.
export default efs;
