function a() {
    return require("./a");
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
