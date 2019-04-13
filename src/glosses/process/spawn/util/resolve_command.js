const {
    is,
    fs: { whichSync },
    std: { path }
} = adone;

const pathKey = adone.system.env.pathKey();

const resolveCommandAttempt = function (parsed, withoutPathExt) {
    const cwd = process.cwd();
    const hasCustomCwd = !is.nil(parsed.options.cwd);

    // If a custom `cwd` was specified, we need to change the process cwd
    // because `which` will do stat calls but does not support a custom cwd
    if (hasCustomCwd) {
        try {
            process.chdir(parsed.options.cwd);
        } catch (err) {
            /* Empty */
        }
    }

    let resolved;

    try {
        resolved = whichSync(parsed.command, {
            path: (parsed.options.env || process.env)[pathKey],
            pathExt: withoutPathExt ? path.delimiter : undefined
        });
    } catch (e) {
        /* Empty */
    } finally {
        process.chdir(cwd);
    }

    // If we successfully resolved, ensure that an absolute path is returned
    // Note that when a custom `cwd` was used, we need to resolve to an absolute path based on it
    if (resolved) {
        resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
    }

    return resolved;
};

const resolveCommand = (parsed) => resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);

module.exports = resolveCommand;
