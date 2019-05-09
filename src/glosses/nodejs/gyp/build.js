const {
    error,
    is,
    fs,
    path,
    util
} = adone;

export default async ({ realm, path: addonPath, debug, jobs = process.env.JOBS, solution, argv } = {}) => {
    argv = util.arrify(argv);
    let platformMake = "make";
    if (process.platform === "aix") {
        platformMake = "gmake";
    } else if (process.platform.includes("bsd")) {
        platformMake = "gmake";
    } else if (is.windows && argv.length > 0) {
        argv = argv.map((target) => {
            return `/t:${target}`;
        });
    }

    const makeCommand = process.env.MAKE || platformMake;
    let command = is.windows ? "msbuild" : makeCommand;
    const buildPath = adone.nodejs.gyp.getBuildPath(realm, addonPath);

    // Load the "config.gypi" file that was generated during "configure".

    const configPath = path.join(buildPath, "config.gypi");
    let data;
    try {
        data = await fs.readFile(configPath, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            throw new error.NotFoundException("You must configure first!");
        }
        throw err;
    }

    const config = JSON.parse(data.replace(/\#.+\n/, ""));

    // get the 'arch', 'buildType', and 'nodeDir' vars from the config
    let buildType = config.target_defaults.default_configuration;
    const arch = config.variables.target_arch;

    if (is.boolean(debug)) {
        buildType = debug ? "Debug" : "Release";
    }
    if (!buildType) {
        buildType = "Release";
    }

    // Uses node-which to locate the msbuild / make executable.
    const doWhich = async () => {
        // On Windows use msbuild provided by node-gyp configure
        if (is.windows && config.variables.msbuild_path) {
            command = config.variables.msbuild_path;
            return;
        }
        // First make sure we have the build command in the PATH
        try {
            await fs.which(command);
        } catch (err) {
            if (is.windows && /not found/.test(err.message)) {
                // Search for the location of "msbuild.exe" file on Windows.
                const findMsbuild = () => {
                    const notfoundErr = 'Can\'t find "msbuild.exe". Do you have Microsoft Visual Studio C++ 2008+ installed?';
                    let cmd = 'reg query "HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions" /s';
                    if (process.arch !== "ia32") {
                        cmd += " /reg:32";
                    }
                    exec(cmd, (err, stdout) => {
                        if (err) {
                            return callback(new Error(`${err.message}\n${notfoundErr}`));
                        }
                        const reVers = /ToolsVersions\\([^\\]+)$/i;
                        const rePath = /\r\n[ \t]+MSBuildToolsPath[ \t]+REG_SZ[ \t]+([^\r]+)/i;
                        const msbuilds = [];
                        let r;
                        let msbuildPath;
                        stdout.split("\r\n\r\n").forEach((l) => {
                            if (!l) {
                                return;
                            }
                            l = l.trim();
                            if (r = reVers.exec(l.substring(0, l.indexOf("\r\n")))) {
                                const ver = parseFloat(r[1], 10);
                                if (ver >= 3.5) {
                                    if (r = rePath.exec(l)) {
                                        msbuilds.push({
                                            version: ver,
                                            path: r[1]
                                        });
                                    }
                                }
                            }
                        });
                        msbuilds.sort((x, y) => {
                            return (x.version < y.version ? -1 : 1);
                        });
                        (function verifyMsbuild() {
                            if (!msbuilds.length) {
                                return callback(new Error(notfoundErr));
                            }
                            msbuildPath = path.resolve(msbuilds.pop().path, "msbuild.exe");
                            fs.stat(msbuildPath, (err) => {
                                if (err) {
                                    if (err.code == "ENOENT") {
                                        if (msbuilds.length) {
                                            return verifyMsbuild();
                                        }
                                        callback(new Error(notfoundErr));

                                    } else {
                                        callback(err);
                                    }
                                    return;
                                }
                                command = msbuildPath;
                                doBuild();
                            });
                        })();
                    });
                };
                // On windows and no 'msbuild' found. Let's guess where it is
                return findMsbuild();
            }
            // Some other error or 'make' not found on Unix, report that to the user
            throw err;
        }
    };

    let guessedSolution;
    if (is.windows) {
        /**
         * On Windows, find the first build/*.sln file.
         */
        const files = await adone.glob(path.join(buildPath, "*.sln"));
        guessedSolution = files[0];
    }

    await doWhich();

    // Enable Verbose build
    // const verbose = log.levels[log.level] <= log.levels.verbose;
    // if (!win && verbose) {
    //     argv.push("V=1");
    // }
    // if (win && !verbose) {
    //     argv.push("/clp:Verbosity=minimal");
    // }

    if (is.windows) {
        // Turn off the Microsoft logo on Windows
        argv.push("/nologo");

        // Specify the build type, Release by default

        // Convert .gypi config target_arch to MSBuild /Platform
        // Since there are many ways to state '32-bit Intel', default to it.
        // N.B. msbuild's Condition string equality tests are case-insensitive.
        const archLower = arch.toLowerCase();
        const p = archLower === "x64"
            ? "x64"
            : (archLower === "arm"
                ? "ARM"
                : (archLower === "arm64" ? "ARM64" : "Win32"));
        argv.push(`/p:Configuration=${buildType};Platform=${p}`);
        if (jobs) {
            const j = parseInt(jobs, 10);
            if (!isNaN(j) && j > 0) {
                argv.push(`/m:${j}`);
            } else if (jobs.toUpperCase() === "MAX") {
                argv.push(`/m:${require("os").cpus().length}`);
            }
        }

        // did the user specify their own .sln file?
        const hasSln = argv.some((arg) => {
            return path.extname(arg) === ".sln";
        });
        if (!hasSln) {
            argv.unshift(solution || guessedSolution);
        }
    } else {
        argv.push("V=1");
        argv.push(`BUILDTYPE=${buildType}`);
        // Invoke the Makefile in the 'build' dir.
        if (jobs) {
            const j = parseInt(jobs, 10);
            if (!isNaN(j) && j > 0) {
                argv.push("--jobs");
                argv.push(j);
            } else if (jobs.toUpperCase() === "MAX") {
                argv.push("--jobs");
                argv.push(require("os").cpus().length);
            }
        }
    }

    return adone.process.exec(command, argv, {
        cwd: buildPath
    });
};
