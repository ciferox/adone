const {
    is,
    std: { os },
    shell
} = adone;

export default {
    moduleVersion: adone.package.version,
    platform: os.platform(),
    isWin: os.platform() === "win32",
    isLinux: os.platform() === "linux",
    isOSX: os.platform() === "darwin",
    arch: os.arch(),
    isX86: os.arch() === "ia32",
    isX64: os.arch() === "x64",
    isArm: os.arch() === "arm",
    runtime: "node",
    runtimeVersion: process.versions.node,
    home: process.env[(os.platform() === "win32") ? "USERPROFILE" : "HOME"],
    EOL: os.EOL,

    get isPosix() {
        return !this.isWin;
    },
    _isNinjaAvailable: null,
    get isNinjaAvailable() {
        if (is.null(this._isNinjaAvailable)) {
            this._isNinjaAvailable = false;
            try {
                shell.which("ninja");
                if (is.null(shell.error())) {
                    this._isNinjaAvailable = true;
                }
            } catch (e) {
                //
            }
        }
        return this._isNinjaAvailable;
    },
    _isMakeAvailable: null,
    get isMakeAvailable() {
        if (is.null(this._isMakeAvailable)) {
            this._isMakeAvailable = false;
            try {
                shell.which("make");
                if (is.null(shell.error())) {
                    this._isMakeAvailable = true;
                }
            } catch (e) {
                //
            }
        }
        return this._isMakeAvailable;
    },
    _isGPPAvailable: null,
    get isGPPAvailable() {
        if (is.null(this._isGPPAvailable)) {
            this._isGPPAvailable = false;
            try {
                shell.which("g++");
                if (is.null(shell.error())) {
                    this._isGPPAvailable = true;
                }
            } catch (e) {
                //
            }
        }
        return this._isGPPAvailable;
    },
    _isClangAvailable: null,
    get isClangAvailable() {
        if (is.null(this._isClangAvailable)) {
            this._isClangAvailable = false;
            try {
                shell.which("clang++");
                if (is.null(shell.error())) {
                    this._isClangAvailable = true;
                }
            } catch (e) {
                //
            }
        }
        return this._isClangAvailable;
    }
};
