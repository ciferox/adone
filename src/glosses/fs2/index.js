import { improve } from "./extra";

const base = require("./base");

const efs = adone.asNamespace(improve(base));
efs.base = base;

adone.lazify({
    custom: "./custom"
}, efs, require);

// export improved (extended and promisified) version of base.
export default efs;
