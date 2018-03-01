const {
    is,
    fs,
    std: { path }
} = adone;

const activeFiles = {};

let invocations = 0;

const cleanupOnExit = (tmpfile) => {
    return async () => {
        try {
            await fs.unlink(is.function(tmpfile) ? tmpfile() : tmpfile);
        } catch (_) {
            //
        }
    };
};

export default async (filename, data, options = {}) => {
    let truename;
    let fd;
    let tmpfile;
    const removeOnExit = cleanupOnExit(() => tmpfile);
    const absoluteName = path.resolve(filename);

    return new Promise((superResolve, superReject) => {
        new Promise((resolve) => {
            // make a queue if it doesn't already exist
            if (!activeFiles[absoluteName]) {
                activeFiles[absoluteName] = [];
            }

            activeFiles[absoluteName].push(resolve); // add this job to the queue
            if (activeFiles[absoluteName].length === 1) {
                resolve();
            } // kick off the first one
        }).then(async () => {
            try {
                truename = await fs.realpath(filename);
            } catch (err) {
                truename = filename;
            }
            tmpfile = `${truename}.${adone.crypto.hash.murmur3.x86.hash128(`${process.pid}${++invocations}`)}`;
        }).then(async () => {
            if (!(options.mode && options.chown)) {
                // Either mode or chown is not explicitly set
                // Default behavior is to copy it from original file
                try {
                    const stats = await fs.stat(truename);
                    options = Object.assign({}, options);

                    if (!options.mode) {
                        options.mode = stats.mode;
                    }
                    if (!options.chown && process.getuid) {
                        options.chown = { uid: stats.uid, gid: stats.gid };
                    }
                } catch (err) {
                    //
                }
            }
        }).then(async () => {
            fd = await fs.open(tmpfile, "w", options.mode);
        }).then(async () => {
            if (is.buffer(data)) {
                await fs.write(fd, data, 0, data.length, 0);
            } else if (!is.nil(data)) {
                await fs.write(fd, String(data), 0, String(options.encoding || "utf8"));
            }
        }).then(async () => {
            if (options.fsync !== false) {
                try {
                    await fs.fsync(fd);
                    await fs.close(fd);
                } catch (err) {
                    throw err;
                }
            }
        }).then(async () => {
            if (options.chown) {
                await fs.chown(tmpfile, options.chown.uid, options.chown.gid);
            }
        }).then(async () => {
            if (options.mode) {
                await fs.chmod(tmpfile, options.mode);
            }
        }).then(async () => {
            await fs.rename(tmpfile, truename);
        }).then(async () => {
            await removeOnExit();
            superResolve();
        }).catch(async (err) => {
            try {
                await removeOnExit();
                await fs.unlink(tmpfile);
            } catch (err) {
                //
            } finally {
                superReject(err);
            }
        }).then(() => {
            activeFiles[absoluteName].shift(); // remove the element added by serializeSameFile
            if (activeFiles[absoluteName].length > 0) {
                activeFiles[absoluteName][0](); // start next job if one is pending
            } else {
                delete activeFiles[absoluteName];
            }
        });
    });
};
