const {
    fs: {
        fuse,
        engine: {
            MemoryEngine
        }
    },
    identity,
    promise
} = adone;

const forwarderMethod = (fn) => function (...args) {
    const cb = args.pop();
    const p = fn.apply(this, args).catch((err) => {
        return Promise.reject(fuse.errno(err.code));
    });
    return promise.nodeify(p, cb);
};

const createForwarder = (engine) => ({
    getattr: forwarderMethod((path) => engine.lstat(path)),
    readdir: forwarderMethod((path) => engine.readdir(path).then((files) => [".", ".."].concat(files))),
    open: forwarderMethod((path, flags) => engine.open(path, flags)),
    release: forwarderMethod((path, fd) => engine.close(fd)),
    read: (path, fd, buffer, length, position, callback) => engine.read(fd, buffer, 0, length, position).then((bytes) => {
        callback(bytes);
    }, () => {
        callback(0);
    }),
    write: (path, fd, buffer, length, position, callback) => engine.write(fd, buffer, 0, length, position).then((bytes) => {
        callback(bytes);
    }, () => {
        callback(0);
    }),
    truncate: forwarderMethod((path, length) => engine.truncate(path, length)),
    create: forwarderMethod((path, mode) => engine.open(path, "w", mode)),
    unlink: forwarderMethod((path) => engine.unlink(path)),
    utimens: forwarderMethod((path, atime, mtime) => engine.utimes(path, atime, mtime)),
    rmdir: forwarderMethod((path) => engine.rmdir(path)),
    mkdir: forwarderMethod((path, mode) => engine.mkdir(path, mode)),
    chmod: forwarderMethod((path, mode) => engine.chmod(path, mode)),
    chown: forwarderMethod((path, uid, gid) => engine.chown(path, uid, gid)),
    rename: forwarderMethod((oldPath, newPath) => engine.rename(oldPath, newPath)),
    symlink: forwarderMethod((target, path) => engine.symlink(target, path)),
    readlink: forwarderMethod((path) => engine.readlink(path)),
    link: forwarderMethod((existingPath, newPath) => engine.link(existingPath, newPath)),
    fgetattr: forwarderMethod((path, fd) => engine.fstat(fd)),
    fsync: forwarderMethod((path, fd, datasync) => datasync ? engine.fdatasync(fd) : engine.fsync(fd))
});

export default class FuseEngine extends MemoryEngine {
    constructor(mntPath) {
        super();
        this.mntPath = mntPath;
        this._decotrator = identity;
    }

    decorate(decorator) {
        this._decotrator = decorator;
    }

    async _initialize() {
        const forwarder = createForwarder(this);
        await fuse.mount(this.mntPath, this._decotrator(forwarder) || forwarder);
    }

    async _uninitialize() {
        await fuse.unmount(this.mntPath);
    }
}
