export default (fs) => {
    const { open, write, close, rename, fsync, unlink } = fs;
    const { join, dirname } = adone.path;

    let counter = 0;

    const cleanup = (dest, err, cb) => unlink(dest, () => cb(err));
    const closeAndCleanup = (fd, dest, err, cb) => close(fd, () => cleanup(dest, err, cb));

    const writeLoop = (fd, content, contentLength, offset, cb) => {
        write(fd, content, offset, (err, bytesWritten) => {
            if (err) {
                cb(err);
                return;
            }

            if (bytesWritten < contentLength - offset) {
                writeLoop(fd, content, contentLength, offset + bytesWritten, cb);
            } else {
                cb(null);
            }
        });
    };

    const openLoop = (dest, cb) => {
        open(dest, "w", (err, fd) => {
            if (err) {
                if (err.code === "EMFILE") {
                    openLoop(dest, cb);
                    return;
                }

                cb(err);
                return;
            }

            cb(null, fd);
        });
    };

    return function (path, content, cb) {
        const tmp = join(dirname(path), `.${process.pid}.${counter++}`);
        openLoop(tmp, (err, fd) => {
            if (err) {
                cb(err);
                return;
            }

            const contentLength = Buffer.byteLength(content);
            writeLoop(fd, content, contentLength, 0, (err) => {
                if (err) {
                    closeAndCleanup(fd, tmp, err, cb);
                    return;
                }

                fsync(fd, (err) => {
                    if (err) {
                        closeAndCleanup(fd, tmp, err, cb);
                        return;
                    }

                    close(fd, (err) => {
                        if (err) {
                            // TODO could we possibly be leaking a file descriptor here?
                            cleanup(tmp, err, cb);
                            return;
                        }

                        rename(tmp, path, (err) => {
                            if (err) {
                                cleanup(tmp, err, cb);
                                return;
                            }

                            cb(null);
                        });
                    });
                });
            });

            // clean up after oursevles, this is not needed
            // anymore
            content = null;
        });
    };
};
