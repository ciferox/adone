const {
    is,
    fs: { which },
    process: { exec },
    system: { env }
} = adone;

const make = is.windows
    ? "vcbuild.bat"
    : (is.openbsd || is.freebsd)
        ? "gmake"
        : "make";

const configure = is.windows
    ? "configure.py" :
    "./configure.py";

export default class NodejsCompiler {
    constructor({ cwd } = {}) {
        this.cwd = cwd;
        this.env = env.all({
            cwd
        });
    }

    async configure({ flags = [] } = {}) {
        const python = this.env.PYTHON || await which("python");

        return exec(python, [configure, ...flags], {
            env: this.env,
            cwd: this.cwd
        });
    }

    async build(options) {
        return exec(make, [...(is.windows ? ["nosign", "release"] : []), ...options], {
            env: this.env,
            cwd: this.cwd
        });
    }

    async clean() {
        return exec(make, ["clean"], {
            env: this.env,
            cwd: this.cwd
        });
    }
}
