function a() {
    return require("./a1");
}

export const exps = {
    b() {
        const b = require("./b");

        const c = function () {
            return require("./c");
        };

        return {
            b, c
        };
    }
};
