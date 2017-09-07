const { lazify } = adone;

lazify({
    init: "./init",
    write: "./write",
    util: "./util"
}, exports, require);
