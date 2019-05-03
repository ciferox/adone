const {
    is,
    semver,
    fs,
    path,
    std: { childProcess, util }
} = adone;

class PythonFinder {
    constructor(pythonPath) {
        this.pythonPath = pythonPath;
    }

    findPython() {
        const SKIP = 0;
        const FAIL = 1;
        const toCheck = [
            {
                before: () => {
                    if (!this.pythonPath) {
                        return SKIP;
                    }
                },
                check: this.checkCommand,
                arg: this.pythonPath
            },
            {
                before: () => {
                    if (!process.env.PYTHON) {
                        return SKIP;
                    }
                },
                check: this.checkCommand,
                arg: process.env.PYTHON
            },
            {
                before: () => { },
                check: this.checkCommand,
                arg: "python2"
            },
            {
                before: () => { },
                check: this.checkCommand,
                arg: "python"
            },
            {
                before: () => {
                    if (!is.windows) {
                        // Everything after this is Windows specific
                        return FAIL;
                    }
                },
                check: this.checkPyLauncher
            },
            {
                before: () => {
                },
                check: this.checkExecPath,
                arg: this.defaultLocation
            }
        ];

        const runChecks = () => {
            const check = toCheck.shift();
            if (!check) {
                throw new adone.error.NotFoundException("Could not find any Python 2 installation to use");
            }

            const before = check.before();
            if (before === SKIP) {
                return runChecks();
            }
            if (before === FAIL) {
                throw new adone.error.NotFoundException("Could not find any Python 2 installation to use");
            }

            return check.check.apply(this, [check.arg]);
        };

        return runChecks();
    }

    // Check if command is a valid Python to use.
    // Will exit the Python finder on success.
    // If on Windows, run in a CMD shell to support BAT/CMD launchers.
    async checkCommand(command) {
        let exec = command;
        let args = this.argsExecutable;
        let shell = false;
        if (is.windows) {
            // Arguments have to be manually quoted
            exec = `"${exec}"`;
            args = args.map((a) => `"${a}"`);
            shell = true;
        }

        const execPath = await this.run(exec, args, shell);
        return this.checkExecPath(execPath);
    }

    // Check if the py launcher can find a valid Python to use.
    // Will exit the Python finder on success.
    // Distributions of Python on Windows by default install with the "py.exe"
    // Python launcher which is more likely to exist than the Python executable
    // being in the $PATH.
    // Because the Python launcher supports all versions of Python, we have to
    // explicitly request a Python 2 version. This is done by supplying "-2" as
    // the first command line argument. Since "py.exe -2" would be an invalid
    // executable for "execFile", we have to use the launcher to figure out
    // where the actual "python.exe" executable is located.
    async checkPyLauncher() {
        const execPath = await this.run(this.pyLauncher, ["-2", ...this.argsExecutable], false);
        return this.checkExecPath(execPath);
    }

    // Check if a Python executable is the correct version to use.
    // Will exit the Python finder on success.
    async checkExecPath(execPath) {
        const version = await this.run(execPath, this.argsVersion, false);
        const range = new semver.Range(this.semverRange);
        const valid = range.test(version);

        if (!valid) {
            throw new Error(`Found unsupported Python version ${version}`);
        }

        return execPath;
    }

    // Run an executable or shell command, trimming the output.
    run(exec, args, shell) {
        const env = Object.assign({}, process.env);
        env.TERM = "dumb";
        const opts = { env, shell };

        return new Promise((resolve, reject) => {
            const execFileCallback = (err, stdout, stderr) => {
                if (err) {
                    return reject(err);
                }
                const execPath = stdout.trim();
                resolve(execPath);
            };

            try {
                childProcess.execFile(exec, args, opts, execFileCallback);
            } catch (err) {
                reject(err);
            }
        });
    }
}
PythonFinder.prototype.argsExecutable = ["-c", "import sys; print(sys.executable);"];
PythonFinder.prototype.argsVersion = ["-c", 'import sys; print("%s.%s.%s" % sys.version_info[:3]);'];
PythonFinder.prototype.semverRange = ">=2.6.0 <3.0.0";
PythonFinder.prototype.pyLauncher = "py.exe";
PythonFinder.prototype.defaultLocation = path.join(process.env.SystemDrive || "C:", "Python27", "python.exe");

const configure = async ({ realm, path: addonPath, nodePath, python: pythonPath, debug = false, arch, thin, msvsVersion, nodeEngine, options = {} } = {}) => {
    const configNames = ["config.gypi", "common.gypi"];
    const configs = [];
    const buildDir = adone.nodejs.gyp.getBuildPath(realm, addonPath); // may be expose to options...
    const addonFullPath = path.join(realm.getPath(), addonPath);
    const finder = new PythonFinder(pythonPath);
    const python = await finder.findPython();

    // 'python' should be set by now
    process.env.PYTHON = python;

    await fs.mkdirp(buildDir);

    const runGyp = async () => {
        const argv = [];
        if (is.windows) {
            argv.push("-f", "msvs");
        } else {
            argv.push("-f", "make");
        }

        const hasMsvsVersion = () => argv.some((arg) => arg.indexOf("msvs_version") === 0);

        if (is.windows && !hasMsvsVersion()) {
            if (msvsVersion) {
                argv.push("-G", `msvs_version=${msvsVersion}`);
            } else {
                argv.push("-G", "msvs_version=auto");
            }
        }

        // include all the ".gypi" files that were found
        configs.forEach((config) => {
            argv.push("-I", config);
        });

        // For AIX and z/OS we need to set up the path to the exports file
        // which contains the symbols needed for linking.
        let nodeExpFile = undefined;
        if (process.platform === "aix" || process.platform === "os390") {
            const ext = process.platform === "aix" ? "exp" : "x";
            const findNodeDirectory = require("./find_node_directory");
            const node_root_dir = findNodeDirectory();
            let candidates = undefined;
            if (process.platform === "aix") {
                candidates = [
                    "include/node/node",
                    "out/Release/node",
                    "out/Debug/node",
                    "node"
                ].map((file) => {
                    return `${file}.${ext}`;
                });
            } else {
                candidates = [
                    "out/Release/obj.target/libnode",
                    "out/Debug/obj.target/libnode",
                    "lib/libnode"
                ].map((file) => {
                    return `${file}.${ext}`;
                });
            }
            const logprefix = "find exports file";

            /**
             * Returns the first file or directory from an array of candidates that is
             * readable by the current user, or undefined if none of the candidates are
             * readable.
             */
            const findAccessibleSync = (logprefix, dir, candidates) => {
                for (let next = 0; next < candidates.length; next++) {
                    const candidate = path.resolve(dir, candidates[next]);
                    let fd;
                    try {
                        fd = fs.openSync(candidate, "r");
                    } catch (e) {
                        // this candidate was not found or not readable, do nothing
                        continue;
                    }
                    fs.closeSync(fd);
                    return candidate;
                }
                return undefined;
            };

            nodeExpFile = findAccessibleSync(logprefix, node_root_dir, candidates);
            if (is.undefined(nodeExpFile)) {
                const msg = util.format("Could not find node.%s file in %s", ext, node_root_dir);
                throw new Error(msg);
            }
        }

        // this logic ported from the old `gyp_addon` python file
        const gypScript = path.resolve(__dirname, "gyp", "gyp_main.py");
        const addonGypi = path.resolve(__dirname, "addon", "addon.gypi");
        let commonGypi = path.resolve(nodePath, "include/node/common.gypi");
        try {
            await fs.stat(commonGypi);
        } catch (err) {
            commonGypi = path.resolve(nodePath, "common.gypi");
        }

        const outputDir = buildDir;
        const nodeGypAddonDir = path.resolve(__dirname, "addon");
        const nodeLibFile = path.join(nodePath, "$(Configuration)", "node.lib");

        argv.push("-I", addonGypi);
        argv.push("-I", commonGypi);
        argv.push("-Dlibrary=shared_library");
        argv.push("-Dvisibility=default");
        argv.push(`-Dnode_root_dir=${nodePath}`);
        argv.push(`-Dadone_native_dir=${adone.getPath("lib", "native")}`);
        argv.push(`-Dadone_root_dir=${adone.cwd}`);
        if (process.platform === "aix" || process.platform === "os390") {
            argv.push(`-Dnode_exp_file=${nodeExpFile}`);
        }
        argv.push(`-Dnode_gyp_addon_dir=${nodeGypAddonDir}`);
        argv.push(`-Dnode_lib_file=${nodeLibFile}`);
        argv.push(`-Dnode_build_dir=${buildDir}`);
        argv.push(`-Dmodule_root_dir=${addonFullPath}`);
        argv.push(`-Daddon_root_dir=${addonFullPath}`);
        argv.push(`-Dnode_engine=${nodeEngine || process.jsEngine || "v8"}`);
        argv.push("--depth=.");
        argv.push("--no-parallel");

        // tell gyp to write the Makefile/Solution files into output_dir
        argv.push("--generator-output", outputDir);

        // tell make to write its output into the same dir
        argv.push("-Goutput_dir=.");

        // enforce use of the "binding.gyp" file
        argv.unshift("binding.gyp");

        // execute `gyp` from the current target nodedir
        argv.unshift(gypScript);

        // make sure python uses files that came with this particular node package
        const pypath = [path.join(__dirname, "gyp", "pylib")];
        if (process.env.PYTHONPATH) {
            pypath.push(process.env.PYTHONPATH);
        }
        process.env.PYTHONPATH = pypath.join(is.windows ? ";" : ":");

        return adone.process.exec(python, argv, {
            cwd: addonFullPath
        });
    };

    const findConfigs = async () => {
        const name = configNames.shift();
        if (!name) {
            return runGyp();
        }
        const fullPath = path.resolve(addonFullPath, name);
        try {
            await fs.stat(fullPath);
            configs.push(fullPath);
            return findConfigs();
        } catch (err) {
            if (err.code === "ENOENT") {
                return findConfigs(); // check next gypi filename
            }
            throw err;
        }
    };

    const createConfigFile = async (vsSetup) => {
        const configFilename = "config.gypi";
        const configPath = path.resolve(buildDir, configFilename);

        const config = process.config || {};
        let defaults = config.target_defaults;
        let variables = config.variables;

        // default "config.variables"
        if (!variables) {
            variables = config.variables = {};
        }

        // default "config.defaults"
        if (!defaults) {
            defaults = config.target_defaults = {};
        }

        // don't inherit the "defaults" from node's `process.config` object.
        // doing so could cause problems in cases where the `node` executable was
        // compiled on a different machine (with different lib/include paths) than
        // the machine where the addon is being built to
        defaults.cflags = [];
        defaults.defines = [];
        defaults.include_dirs = [];
        defaults.libraries = [];

        // set the default_configuration prop
        defaults.default_configuration = debug ? "Debug" : "Release";

        // set the target_arch variable
        variables.target_arch = arch || process.arch || "ia32";

        // set the node development directory
        variables.nodedir = nodePath;

        // disable -T "thin" static archives by default
        variables.standalone_static_library = thin ? 0 : 1;

        if (vsSetup) {
            // GYP doesn't (yet) have support for VS2017, so we force it to VS2015
            // to avoid pulling a floating patch that has not landed upstream.
            // Ref: https://chromium-review.googlesource.com/#/c/433540/
            msvsVersion = "2015";
            process.env.GYP_MSVS_VERSION = 2015;
            process.env.GYP_MSVS_OVERRIDE_PATH = vsSetup.path;
            defaults.msbuild_toolset = "v141";
            defaults.msvs_windows_target_platform_version = vsSetup.sdk;
            variables.msbuild_path = path.join(vsSetup.path, "MSBuild", "15.0", "Bin", "MSBuild.exe");
        }

        // loop through the rest of the opts and add the unknown ones as variables.
        // this allows for module-specific configure flags like:
        Object.keys(options).forEach((opt) => {
            variables[opt.replace(/-/g, "_")] = options[opt];
        });

        // ensures that any boolean values from `process.config` get stringified
        const boolsToString = (k, v) => {
            if (is.boolean(v)) {
                return String(v);
            }
            return v;
        };

        // now write out the config.gypi file to the build/ dir
        const prefix = "# Do not edit. File was generated by ADONE gyp's 'configure' step";
        const json = JSON.stringify(config, boolsToString, 2);
        configs.push(configPath);
        await fs.writeFile(configPath, [prefix, json, ""].join("\n"));
        return findConfigs();
    };

    if (is.windows && (!msvsVersion || msvsVersion === "2017")) {
        const findVS2017 = require("./find_vs2017");
        const vsSetup = await findVS2017();
        return createConfigFile(vsSetup);
    }
    return createConfigFile();
};

export default configure;
