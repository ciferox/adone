const {
    lazify
} = adone;

lazify({
    a: "./a",
    b: ["./b", (mod) => mod.b]
}, exports, require);

const __ = lazify({
    ff: () => {
        return require("./g");
    },
    d: "./d",
    c: ["./c", (mod) => mod.c]
}, exports, (...args) => {
    require("./e");
    return require(...args);
}, {
    mapper(key, mod) {
        require("./f");
    }
});
