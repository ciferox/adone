const {
    is,
    fs2: { base }
} = adone;

const glob = require("glob");
const log = require("npmlog");
const which = require("which");

const {
    is,
    std: { path, childProcess: { exec } }
} = adone;

const build = function (gyp, argv) {
    return new Promise((resolve, reject) => {
        let platformMake = "make";
        if (process.platform === "aix") {
            platformMake = "gmake";
        } else if (process.platform.indexOf("bsd") !== -1) {
            platformMake = "gmake";
        }

        const makeCommand = gyp.opts.make || process.env.MAKE || platformMake;
        let command = is.windows ? "msbuild" : makeCommand;
        const buildDir = path.resolve("build");
        const configPath = path.resolve(buildDir, "config.gypi");
        const jobs = gyp.opts.jobs || process.env.JOBS;
        let buildType;
        let config;
        let arch;
        let nodeDir;

        /**
         * Invoked after the make/msbuild command exits.
         */
        const onExit = function (code, signal) {
            if (code !== 0) {
                return reject(new Error(`\`${command}\` failed with exit code: ${code}`));
            }
            if (signal) {
                return reject(new Error(`\`${command}\` got signal: ${signal}`));
            }
            resolve();
        };

        let guessedSolution;

        /**
         * Actually spawn the process and compile the module.
         */
        const doBuild = function () {

            // Enable Verbose build
            const verbose = log.levels[log.level] <= log.levels.verbose;
            if (!is.windows && verbose) {
                argv.push("V=1");
            }
            if (is.windows && !verbose) {
                argv.push("/clp:Verbosity=minimal");
            }

            if (is.windows) {
                // Turn off the Microsoft logo on Windows
                argv.push("/nologo");
            }

            // Specify the build type, Release by default
            if (is.windows) {
                const archLower = arch.toLowerCase();
                const p = archLower === "x64" ? "x64" :
                    (archLower === "arm" ? "ARM" : "Win32");
                argv.push(`/p:Configuration=${buildType};Platform=${p}`);
                if (jobs) {
                    const j = parseInt(jobs, 10);
                    if (!isNaN(j) && j > 0) {
                        argv.push(`/m:${j}`);
                    } else if (jobs.toUpperCase() === "MAX") {
                        argv.push(`/m:${require("os").cpus().length}`);
                    }
                }
            } else {
                argv.push(`BUILDTYPE=${buildType}`);
                // Invoke the Makefile in the 'build' dir.
                argv.push("-C");
                argv.push("build");
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

            if (is.windows) {
                // did the user specify their own .sln file?
                const hasSln = argv.some((arg) => {
                    return path.extname(arg) === ".sln";
                });
                if (!hasSln) {
                    argv.unshift(gyp.opts.solution || guessedSolution);
                }
            }

            const proc = gyp.spawn(command, argv);
            proc.on("exit", onExit);
        };

        /**
         * Search for the location of "msbuild.exe" file on Windows.
         */
        const findMsbuild = function () {
            if (config.variables.msbuild_path) {
                command = config.variables.msbuild_path;
                log.verbose("using MSBuild:", command);
                doBuild();
                return;
            }

            log.verbose('could not find "msbuild.exe" in PATH - finding location in registry');
            const notfoundErr = 'Can\'t find "msbuild.exe". Do you have Microsoft Visual Studio C++ 2008+ installed?';
            let cmd = 'reg query "HKLM\\Software\\Microsoft\\MSBuild\\ToolsVersions" /s';
            if (process.arch !== "ia32") {
                cmd += " /reg:32";
            }
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(`${err.message}\n${notfoundErr}`));
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
                    r = reVers.exec(l.substring(0, l.indexOf("\r\n")));
                    if (r) {
                        const ver = parseFloat(r[1], 10);
                        if (ver >= 3.5) {
                            r = rePath.exec(l);
                            if (r) {
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

                const verifyMsbuild = () => {
                    if (!msbuilds.length) {
                        return reject(new Error(notfoundErr));
                    }
                    msbuildPath = path.resolve(msbuilds.pop().path, "msbuild.exe");
                    base.stat(msbuildPath, (err, stat) => {
                        if (err) {
                            if (err.code === "ENOENT") {
                                if (msbuilds.length) {
                                    return verifyMsbuild();
                                }
                                reject(new Error(notfoundErr));
                            } else {
                                reject(err);
                            }
                            return;
                        }
                        command = msbuildPath;
                        doBuild();
                    });
                };

                verifyMsbuild();
            });
        };

        /**
         * Uses node-which to locate the msbuild / make executable.
         */
        const doWhich = function () {
            // First make sure we have the build command in the PATH
            which(command, (err, execPath) => {
                if (err) {
                    if (is.windows && /not found/.test(err.message)) {
                        // On windows and no 'msbuild' found. Let's guess where it is
                        findMsbuild();
                    } else {
                        // Some other error or 'make' not found on Unix, report that to the user
                        reject(err);
                    }
                    return;
                }
                log.verbose(`\`which\` succeeded for \`${command}\``, execPath);
                doBuild();
            });
        };

        /**
         * On Windows, find the first build/*.sln file.
         */
        const findSolutionFile = function () {
            glob("build/*.sln", (err, files) => {
                if (err) {
                    return reject(err);
                }
                if (files.length === 0) {
                    return reject(new Error('Could not find *.sln file. Did you run "configure"?'));
                }
                guessedSolution = files[0];
                log.verbose("found first Solution file", guessedSolution);
                doWhich();
            });
        };

        /**
         * Load the "config.gypi" file that was generated during "configure".
         */
        const loadConfigGypi = function () {
            base.readFile(configPath, "utf8", (err, data) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        reject(new Error("You must run `node-gyp configure` first!"));
                    } else {
                        reject(err);
                    }
                    return;
                }
                config = JSON.parse(data.replace(/\#.+\n/, ""));

                // get the 'arch', 'buildType', and 'nodeDir' vars from the config
                buildType = config.target_defaults.default_configuration;
                arch = config.variables.target_arch;
                nodeDir = config.variables.nodedir;

                if ("debug" in gyp.opts) {
                    buildType = gyp.opts.debug ? "Debug" : "Release";
                }
                if (!buildType) {
                    buildType = "Release";
                }

                log.verbose("build type", buildType);
                log.verbose("architecture", arch);
                log.verbose("node dev dir", nodeDir);

                if (is.windows) {
                    findSolutionFile();
                } else {
                    doWhich();
                }
            });
        };

        loadConfigGypi();
    });
};

module.exports = exports = build;
exports.usage = `Invokes \`${is.windows ? "msbuild" : "make"}\` and builds the module`;
