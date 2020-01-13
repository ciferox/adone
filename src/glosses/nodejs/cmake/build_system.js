const {
    assert,
    is,
    lodash: _,
    fs,
    path,
    std: { os }
} = adone;

const environment = {
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
    EOL: os.EOL
};

Object.defineProperties(environment, {
    isPosix: {
        get() {
            return !this.isWin;
        }
    },
    _isNinjaAvailable: {
        value: null,
        writable: true
    },
    isNinjaAvailable: {
        get() {
            if (is.null(this._isNinjaAvailable)) {
                this._isNinjaAvailable = false;
                try {
                    if (fs.whichSync("ninja")) {
                        this._isNinjaAvailable = true;
                    }
                } catch (e) {
                    _.noop(e);
                }
            }
            return this._isNinjaAvailable;
        }
    },
    _isMakeAvailable: {
        value: null,
        writable: true
    },
    isMakeAvailable: {
        get() {
            if (is.null(this._isMakeAvailable)) {
                this._isMakeAvailable = false;
                try {
                    if (fs.whichSync("make")) {
                        this._isMakeAvailable = true;
                    }
                } catch (e) {
                    _.noop(e);
                }
            }
            return this._isMakeAvailable;
        }
    },
    _isGPPAvailable: {
        value: null,
        writable: true
    },
    isGPPAvailable: {
        get() {
            if (is.null(this._isGPPAvailable)) {
                this._isGPPAvailable = false;
                try {
                    if (fs.whichSync("g++")) {
                        this._isGPPAvailable = true;
                    }
                } catch (e) {
                    _.noop(e);
                }
            }
            return this._isGPPAvailable;
        }
    },
    _isClangAvailable: {
        value: null,
        writable: true
    },
    isClangAvailable: {
        get() {
            if (is.null(this._isClangAvailable)) {
                this._isClangAvailable = false;
                try {
                    if (fs.whichSync("clang++")) {
                        this._isClangAvailable = true;
                    }
                } catch (e) {
                    _.noop(e);
                }
            }
            return this._isClangAvailable;
        }
    }
});

const exec = (command) => {
    return new Promise(((resolve, reject) => {
        adone.std.childProcess.exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`${err.message}\n${stdout || stderr}`));
            } else {
                resolve(stdout);
            }
        });
    }));
};

const vsDetect = {
    async isInstalled(version) {
        const vsInstalled = (await this._isVSInstalled(version));
        const vsvNextInstalled = (await this._isVSvNextInstalled(version));
        const buildToolsInstalled = (await this._isBuildToolsInstalled(version));
        const foundByVSWhere = (await this._isFoundByVSWhere(version));

        return vsInstalled || vsvNextInstalled || buildToolsInstalled || foundByVSWhere;
    },
    async _isFoundByVSWhere(version) {
        // TODO: with auto download
        /*
        let mainVer = version.split(".")[0];
        let command = path.resolve("vswhere.exe");
        try {
            let stdout = await exec(command, ["-version", version]);
            return stdout && stdout.indexOf("installationVersion: " + mainVer) > 0;
        }
        catch (e) {
            _.noop(e);
        }
        */
        return false;
    },
    async _isBuildToolsInstalled(version) {
        const mainVer = version.split(".")[0];
        let key;
        let testPhrase;
        if (Number(mainVer) >= 15) {
            key = `HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.windows_toolscore,v${mainVer}`;
            testPhrase = "Version";
        } else {
            key = `HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VS.VisualCppBuildTools_x86_enu,v${mainVer}`;
            testPhrase = "Visual C++";
        }
        const command = `reg query "${key}"`;
        try {
            const stdout = await exec(command);
            return stdout && stdout.indexOf(testPhrase) > 0;
        } catch (e) {
            _.noop(e);
        }
        return false;
    },
    async _isVSInstalled(version) {
        // On x64 this will look for x64 keys only, but if VS and compilers installed properly,
        // it will write it's keys to 64 bit registry as well.
        const command = `reg query "HKLM\\Software\\Microsoft\\VisualStudio\\${version}"`;
        try {
            const stdout = await exec(command);
            if (stdout) {
                const lines = stdout.split("\r\n").filter((line) => {
                    return line.length > 10;
                });
                if (lines.length >= 4) {
                    return true;
                }
            }
        } catch (e) {
            _.noop(e);
        }
        return false;
    },
    async _isVSvNextInstalled(version) {
        const mainVer = version.split(".")[0];
        const command = `reg query "HKLM\\SOFTWARE\\Classes\\Installer\\Dependencies\\Microsoft.VisualStudio.MinShell.Msi,v${mainVer}"`;
        try {
            const stdout = await exec(command);
            if (stdout) {
                const lines = stdout.split("\r\n").filter((line) => {
                    return line.length > 10;
                });
                if (lines.length >= 3) {
                    return true;
                }
            }
        } catch (e) {
            _.noop(e);
        }
        return false;
    }
};

export default class BuildSystem {
    constructor(options) {
        this.options = options || {};
        this.options.directory = path.resolve(this.options.directory || process.cwd());
        this.projectRoot = path.resolve(this.options.directory || process.cwd());
        this.workDir = path.resolve(this.options.out);
        this.config = this.options.debug ? "Debug" : "Release";
        this.buildDir = path.join(this.workDir, this.config);
        this._isAvailable = null;
        this.cMakeOptions = this.options.cMakeOptions || {};
        this.options.silent = is.boolean(this.options.silent) ? this.options.silent : true;
        this.silent = Boolean(options.silent);

        // from toolset
        this.generator = options.generator;
        this.toolset = options.toolset;
        this.target = options.target;
        this.cCompilerPath = null;
        this.cppCompilerPath = null;
        this.compilerFlags = [];
        this.linkerFlags = [];
        this.makePath = null;
        this._initialized = false;
        this.isX86 = (this.options.arch || adone.std.os.arch()) === "ia32";
        this.isX64 = (this.options.arch || adone.std.os.arch()) === "x64";
    }

    getGenerators() {
        return BuildSystem.getGenerators(this.options);
    }

    verifyIfAvailable() {
        if (!this.isAvailable) {
            throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
        }
    }

    async getConfigureCommand() {
        // Create command:
        let command = this.path;
        command += ` "${this.projectRoot}" --no-warn-unused-cli`;

        const D = [];

        // Build configuration:
        D.push({ CMAKE_BUILD_TYPE: this.config });
        if (is.windows) {
            D.push({ CMAKE_RUNTIME_OUTPUT_DIRECTORY: this.workDir });
        } else {
            D.push({ CMAKE_LIBRARY_OUTPUT_DIRECTORY: this.buildDir });
        }
        D.push({ ADONE_BUILD_DIRECTORY: this.workDir });

        const incPaths = [
            path.join(this.options.nodePath, "include/node"),
            adone.getPath("lib", "native", "nan"), // nan
            adone.getPath("lib", "native", "napi"), // napi
            adone.getPath("lib", "native", "napi-macros"), // napi-macros
            adone.getPath("lib", "native", "adone")
        ];

        // Includes:
        D.push({ CMAKE_JS_INC: incPaths.join(";") });

        // Sources:
        const srcPaths = [];
        if (is.windows) {
            const delayHook = path.normalize(path.join(__dirname, "addon", "win_delay_load_hook.cc"));
            srcPaths.push(delayHook.replace(/\\/gm, "/"));
        }

        D.push({ CMAKE_JS_SRC: srcPaths.join(";") });

        // Runtime:
        D.push({ NODE_RUNTIME: "node" });
        D.push({ NODE_RUNTIMEVERSION: this.options.version });
        D.push({ NODE_ARCH: this.options.arch });

        if (is.windows) {
            const libs = [
                path.join(this.options.nodePath, (this.options.arch || adone.std.os.arch()) === "x64" ? "win-x64" : "win-x86", "node.lib")
            ];
            D.push({ CMAKE_JS_LIB: libs.join(";") });
        }

        // Custom options
        for (const k of _.keys(this.cMakeOptions)) {
            D.push({ [k]: this.cMakeOptions[k] });
        }

        // Toolset:
        await this.initialize(false);

        if (this.generator) {
            command += ` -G"${this.generator}"`;
        }
        if (this.toolset) {
            command += ` -T"${this.toolset}"`;
        }
        if (this.cppCompilerPath) {
            D.push({ CMAKE_CXX_COMPILER: this.cppCompilerPath });
        }
        if (this.cCompilerPath) {
            D.push({ CMAKE_C_COMPILER: this.cCompilerPath });
        }
        if (this.compilerFlags.length) {
            D.push({ CMAKE_CXX_FLAGS: this.compilerFlags.join(" ") });
        }
        if (this.linkerFlags.length) {
            D.push({
                CMAKE_SHARED_LINKER_FLAGS: this.linkerFlags.join(" ")
            });
        }
        if (this.makePath) {
            D.push({ CMAKE_MAKE_PROGRAM: this.makePath });
        }

        // TODO: add cmake options from unit

        command += ` ${
            D.map((p) => {
                return `-D${_.keys(p)[0]}="${_.values(p)[0]}"`;
            }).join(" ")}`;

        return command;
    }

    async configure() {
        await this.initialize(true);
        this.verifyIfAvailable();

        const listPath = path.join(this.projectRoot, "CMakeLists.txt");
        const command = await this.getConfigureCommand();

        try {
            await fs.lstat(listPath);
        } catch (e) {
            throw new adone.error.NotFoundException(`'${listPath}' not found`);
        }

        await this._run(command);
    }

    async ensureConfigured() {
        try {
            await fs.lstat(path.join(this.workDir, "CMakeCache.txt"));
        } catch (e) {
            _.noop(e);
            await this.configure();
        }
    }

    getBuildCommand() {
        let command = `${this.path} --build "${this.workDir}" --config ${this.config}`;
        if (this.options.target) {
            command += ` --target ${this.options.target}`;
        }
        return command;
    }

    async build() {
        await this.initialize(true);
        this.verifyIfAvailable();

        await this.ensureConfigured();
        const buildCommand = this.getBuildCommand();
        await this._run(buildCommand);
    }

    getCleanCommand() {
        return `${this.path} -E remove_directory "${this.workDir}"`;
    }

    async clean() {
        await this.initialize(true);
        this.verifyIfAvailable();

        return this._run(this.getCleanCommand());
    }

    async reconfigure() {
        await this.clean();
        await this.configure();
    }

    async rebuild() {
        await this.clean();
        await this.build();
    }

    async compile() {
        try {
            await this.build();
        } catch (e) {
            _.noop(e);
            await this.rebuild();
        }
    }

    _run(command) {
        const options = _.defaults({ silent: this.silent }, { silent: false });
        const args = adone.util.splitArgs(command);
        const name = args[0];
        args.splice(0, 1);
        return adone.process.exec(name, args, {
            cwd: this.workDir,
            // stdio: options.silent ? "ignore" : "inherit"
        });
    }

    static isAvailable(options) {
        options = options || {};
        try {
            if (options.cmakePath) {
                const stat = fs.lstatSync(options.cmakePath);
                return !stat.isDirectory();
            }

            fs.whichSync("cmake");
            return true;

        } catch (e) {
            _.noop(e);
        }
        return false;
    }

    static async getGenerators(options) {
        const arch = " [arch]";
        options = options || {};
        const gens = [];
        if (BuildSystem.isAvailable(options)) {
            // try parsing machine-readable capabilities (available since CMake 3.7)
            try {
                const stdout = await exec(`${options.cmakePath || "cmake"} -E capabilities`);
                const capabilities = JSON.parse(stdout);
                return capabilities.generators.map((x) => x.name);
            } catch (error) {
                console.error(adone.pretty.error(error));
            }

            // fall back to parsing help text
            const stdout = await exec(`${options.cmakePath || "cmake"} --help`);
            const hasCr = stdout.includes("\r\n");
            const output = hasCr ? stdout.split("\r\n") : stdout.split("\n");
            let on = false;
            output.forEach((line, i) => {
                if (on) {
                    const parts = line.split("=");
                    if ((parts.length === 2 && parts[0].trim()) ||
                        (parts.length === 1 && i !== output.length - 1 && output[i + 1].trim()[0] === "=")) {
                        let gen = parts[0].trim();
                        if (_.endsWith(gen, arch)) {
                            gen = gen.substr(0, gen.length - arch.length);
                        }
                        gens.push(gen);
                    }
                }
                if (line.trim() === "Generators") {
                    on = true;
                }
            });
        } else {
            throw new Error("CMake is not installed. Install CMake.");
        }
        return gens;
    }


    // toolset
    async initialize(install) {
        if (!this._initialized) {
            if (is.windows) {
                await this.initializeWin(install);
            } else {
                this.initializePosix(install);
            }
            this._initialized = true;
        }
    }

    initializePosix(install) {
        // 1: Compiler
        if (!environment.isGPPAvailable && !environment.isClangAvailable) {
            if (environment.isOSX) {
                throw new Error("C++ Compiler toolset is not available. Install Xcode Commandline Tools from Apple Dev Center, or install Clang with homebrew by invoking: 'brew install llvm --with-clang --with-asan'.");
            } else {
                throw new Error("C++ Compiler toolset is not available. Install proper compiler toolset with your package manager, eg. 'sudo apt-get install g++'.");
            }
        }

        if (this.options.preferClang && environment.isClangAvailable) {
            this.cppCompilerPath = "clang++";
            this.cCompilerPath = "clang";
        } else if (this.options.preferGnu && environment.isGPPAvailable) {
            this.cppCompilerPath = "g++";
            this.cCompilerPath = "gcc";
        }
        // 2: Generator
        else if (environment.isOSX) {
            if (this.options.preferXcode) {
                this.generator = "Xcode";
            } else if (this.options.preferMake && environment.isMakeAvailable) {
                this.generator = "Unix Makefiles";
            } else if (environment.isNinjaAvailable) {
                this.generator = "Ninja";
            } else {
                this.generator = "Unix Makefiles";
            }
        } else {
            if (this.options.preferMake && environment.isMakeAvailable) {
                this.generator = "Unix Makefiles";
            } else if (environment.isNinjaAvailable) {
                this.generator = "Ninja";
            } else {
                this.generator = "Unix Makefiles";
            }
        }

        // 3: Flags
        if (environment.isOSX) {
            this.compilerFlags.push("-D_DARWIN_USE_64_BIT_INODE=1");
            this.compilerFlags.push("-D_LARGEFILE_SOURCE");
            this.compilerFlags.push("-D_FILE_OFFSET_BITS=64");
            this.compilerFlags.push("-DBUILDING_NODE_EXTENSION");
            this.linkerFlags.push("-undefined dynamic_lookup");
        }
    }

    async initializeWin(install) {
        // Visual Studio:
        // if it's already set because of options...
        if (this.generator) {
            this.linkerFlags.push("/DELAYLOAD:NODE.EXE");

            if (this.isX86) {
                this.linkerFlags.push("/SAFESEH:NO");
            }
            return;
        }
        const topVS = await this._getTopSupportedVisualStudioGenerator();
        //if (!this.options.noMSVC) {
        if (topVS) {
            this.generator = topVS;

            this.linkerFlags.push("/DELAYLOAD:NODE.EXE");

            if (this.isX86) {
                this.linkerFlags.push("/SAFESEH:NO");
            }
        } else {
            throw new Error("There is no Visual C++ compiler installed. Install Visual C++ Build Toolset or Visual Studio.");
        }
    }

    async _getTopSupportedVisualStudioGenerator() {
        assert(is.windows);
        const list = await BuildSystem.getGenerators(this.options);
        let maxVer = 0;
        let result = null;
        for (const gen of list) {
            const found = /^visual studio (\d+)/i.exec(gen);
            if (!found) {
                continue;
            }

            const ver = parseInt(found[1]);
            if (ver <= maxVer) {
                continue;
            }

            const is64Bit = gen.endsWith("Win64");
            if ((this.isX86 && is64Bit) || (this.isX64 && !is64Bit)) {
                continue;
            }

            if (await vsDetect.isInstalled(`${ver}.0`)) {
                result = gen;
                maxVer = ver;
            }
        }
        return result;
    }
}

Object.defineProperties(BuildSystem.prototype, {
    path: {
        get() {
            return this.options.cmakePath || "cmake";
        }
    },
    isAvailable: {
        get() {
            if (is.null(this._isAvailable)) {
                this._isAvailable = BuildSystem.isAvailable(this.options);
            }
            return this._isAvailable;
        }
    }
});
