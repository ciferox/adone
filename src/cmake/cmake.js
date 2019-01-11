import { run } from "./processHelpers";
let npmConfigData = require("rc")("npm");

const {
    is,
    fs,
    cmake: { environment, Toolset, TargetOptions, CMLog, Dist },
    std: { path },
    system: { process: { execStdout } },
    lodash: _,
    shell
} = adone;

export default class CMake {
    constructor(options) {
        this.options = options || {};
        this.log = new CMLog(this.options);
        this.dist = new Dist(this.options);
        this.projectRoot = path.resolve(this.options.directory || process.cwd());
        this.workDir = path.resolve(this.options.out || path.join(this.projectRoot, "build"));
        this.config = this.options.debug ? "Debug" : "Release";
        this.buildDir = path.join(this.workDir, this.config);
        this._isAvailable = null;
        this.targetOptions = new TargetOptions(this.options);
        this.toolset = new Toolset(this.options);
        this.cMakeOptions = this.options.cMakeOptions || {};
        this.silent = Boolean(options.silent);
    }

    get path() {
        return this.options.cmakePath || "cmake";
    }

    get isAvailable() {
        if (is.null(this._isAvailable)) {
            this._isAvailable = CMake.isAvailable(this.options);
        }
        return this._isAvailable;
    }

    getGenerators() {
        return CMake.getGenerators(this.options);
    }

    verifyIfAvailable() {
        if (!this.isAvailable) {
            throw new Error("CMake executable is not found. Please use your system's package manager to install it, or you can get installers from there: http://cmake.org.");
        }
    }

    getBuildCommand() {
        let command = `${this.path} --build "${this.workDir}" --config ${this.config}`;
        if (this.options.target) {
            command += ` --target ${this.options.target}`;
        }
        return command;
    }

    getCleanCommand() {
        return `${this.path} -E remove_directory "${this.workDir}"`;
    }

    clean() {
        this.verifyIfAvailable();

        this.log.info("CMD", "CLEAN");
        return this._run(this.getCleanCommand());
    }

    _run(command) {
        this.log.info("RUN", command);
        return run(command, { silent: this.silent });
    }

    async getConfigureCommand() {
        // Create command:
        let command = this.path;
        command += ` "${this.projectRoot}" --no-warn-unused-cli`;

        const D = [];

        // CMake.js watermark
        D.push({ CMAKE_JS_VERSION: environment.moduleVersion });

        // Build configuration:
        D.push({ CMAKE_BUILD_TYPE: this.config });
        if (environment.isWin) {
            D.push({ CMAKE_RUNTIME_OUTPUT_DIRECTORY: this.workDir });
        } else {
            D.push({ CMAKE_LIBRARY_OUTPUT_DIRECTORY: this.buildDir });
        }

        // Include and lib:
        let incPaths;
        if (this.dist.headerOnly) {
            incPaths = [path.join(this.dist.internalPath, "/include/node")];
        } else {
            const nodeH = path.join(this.dist.internalPath, "/src");
            const v8H = path.join(this.dist.internalPath, "/deps/v8/include");
            const uvH = path.join(this.dist.internalPath, "/deps/uv/include");
            incPaths = [nodeH, v8H, uvH];
        }

        // NAN
        incPaths.push(path.join(adone.ROOT_PATH, "src", "native", "nan"));

        // ADONE
        incPaths.push(path.join(adone.ROOT_PATH, "src", "native", "adone"));

        // Includes:
        D.push({ CMAKE_JS_INC: incPaths.join(";") });

        // Runtime:
        D.push({ NODE_RUNTIME: this.targetOptions.runtime });
        D.push({ NODE_RUNTIMEVERSION: this.targetOptions.runtimeVersion });
        D.push({ NODE_ARCH: this.targetOptions.arch });

        if (environment.isWin) {
            // Win
            const libs = this.dist.winLibs;
            if (libs.length) {
                D.push({
                    CMAKE_JS_LIB: libs.join(";")
                });
            }
        }

        // Custom options
        for (const k of _.keys(this.cMakeOptions)) {
            D.push({ [k]: this.cMakeOptions[k] });
        }

        // Toolset:
        await this.toolset.initialize(false);

        if (this.toolset.generator) {
            command += ` -G"${this.toolset.generator}"`;
        }
        if (this.toolset.toolset) {
            command += ` -T"${this.toolset.toolset}"`;
        }
        if (this.toolset.cppCompilerPath) {
            D.push({
                CMAKE_CXX_COMPILER: this.toolset.cppCompilerPath
            });
        }
        if (this.toolset.cCompilerPath) {
            D.push({
                CMAKE_C_COMPILER: this.toolset.cCompilerPath
            });
        }
        if (this.toolset.compilerFlags.length) {
            D.push({
                CMAKE_CXX_FLAGS: this.toolset.compilerFlags.join(" ")
            });
        }
        if (this.toolset.linkerFlags.length) {
            D.push({
                CMAKE_SHARED_LINKER_FLAGS: this.toolset.linkerFlags.join(" ")
            });
        }
        if (this.toolset.makePath) {
            D.push({
                CMAKE_MAKE_PROGRAM: this.toolset.makePath
            });
        }

        // Load NPM config
        for (const key of _.keys(npmConfigData)) {
            if (_.startsWith(key, "cmake_")) {
                const s = {};
                const sk = key.substr(6);
                if (sk) {
                    s[sk] = npmConfigData[key];
                    if (s[sk]) {
                        D.push(s);
                    }
                }
            }
        }

        command += ` ${
            D.map((p) => {
                return `-D${_.keys(p)[0]}="${_.values(p)[0]}"`;
            }).join(" ")}`;

        return command;
    }

    async configure() {
        this.verifyIfAvailable();

        this.log.info("CMD", "CONFIGURE");
        const listPath = path.join(this.projectRoot, "CMakeLists.txt");
        const command = await this.getConfigureCommand();

        try {
            await fs.lstat(listPath);
        } catch (e) {
            throw new Error(`'${listPath}' not found.`);
        }

        try {
            await fs.mkdir(this.workDir);
        } catch (e) {
            _.noop(e);
        }

        const cwd = process.cwd();
        process.chdir(this.workDir);
        try {
            await this._run(command);
        } finally {
            process.chdir(cwd);
        }
    }

    async ensureConfigured() {
        try {
            await fs.lstat(path.join(this.workDir, "CMakeCache.txt"));
        } catch (e) {
            await this.configure();
        }
    }

    async build() {
        this.verifyIfAvailable();

        await this.ensureConfigured();
        const buildCommand = await this.getBuildCommand();
        this.log.info("CMD", "BUILD");
        return this._run(buildCommand);
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
            this.log.info("REP", "Build has been failed, trying to do a full rebuild.");
            await this.rebuild();
        }
    }

    static isAvailable(options) {
        options = options || {};
        try {
            if (options.cmakePath) {
                const stat = fs.lstatSync(options.cmakePath);
                return !stat.isDirectory();
            }

            shell.which("cmake");
            return is.null(shell.error());
        } catch (e) {
            //
        }
        return false;
    }

    static async getGenerators(options) {
        const arch = " [arch]";
        options = options || {};
        const gens = [];
        if (CMake.isAvailable(options)) {
            const stdout = await execStdout(`${options.cmakePath || "cmake"}`, ["--help"]);
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
}
