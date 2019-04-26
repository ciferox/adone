import { improve } from "./extra";

import base from "./base";

const efs = adone.asNamespace(improve(base));
efs.base = base;
efs.improveFs = improve;

adone.lazify({
    custom: "./custom"
}, efs, require);

// export improved (extended and promisified) version of base.
export default efs;
