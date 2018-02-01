const {
    exception,
    fs,
    std: {
        os,
        path
    }
} = adone;

const native = adone.nativeAddon(path.join(__dirname, "native", "fuse.node"));

adone.asNamespace(exports);

export const EPERM = -1;
export const ENOENT = -2;
export const ESRCH = -3;
export const EINTR = -4;
export const EIO = -5;
export const ENXIO = -6;
export const E2BIG = -7;
export const ENOEXEC = -8;
export const EBADF = -9;
export const ECHILD = -10;
export const EAGAIN = -11;
export const ENOMEM = -12;
export const EACCES = -13;
export const EFAULT = -14;
export const ENOTBLK = -15;
export const EBUSY = -16;
export const EEXIST = -17;
export const EXDEV = -18;
export const ENODEV = -19;
export const ENOTDIR = -20;
export const EISDIR = -21;
export const EINVAL = -22;
export const ENFILE = -23;
export const EMFILE = -24;
export const ENOTTY = -25;
export const ETXTBSY = -26;
export const EFBIG = -27;
export const ENOSPC = -28;
export const ESPIPE = -29;
export const EROFS = -30;
export const EMLINK = -31;
export const EPIPE = -32;
export const EDOM = -33;
export const ERANGE = -34;
export const EDEADLK = -35;
export const ENAMETOOLONG = -36;
export const ENOLCK = -37;
export const ENOSYS = -38;
export const ENOTEMPTY = -39;
export const ELOOP = -40;
export const EWOULDBLOCK = -11;
export const ENOMSG = -42;
export const EIDRM = -43;
export const ECHRNG = -44;
export const EL2NSYNC = -45;
export const EL3HLT = -46;
export const EL3RST = -47;
export const ELNRNG = -48;
export const EUNATCH = -49;
export const ENOCSI = -50;
export const EL2HLT = -51;
export const EBADE = -52;
export const EBADR = -53;
export const EXFULL = -54;
export const ENOANO = -55;
export const EBADRQC = -56;
export const EBADSLT = -57;
export const EDEADLOCK = -35;
export const EBFONT = -59;
export const ENOSTR = -60;
export const ENODATA = -61;
export const ETIME = -62;
export const ENOSR = -63;
export const ENONET = -64;
export const ENOPKG = -65;
export const EREMOTE = -66;
export const ENOLINK = -67;
export const EADV = -68;
export const ESRMNT = -69;
export const ECOMM = -70;
export const EPROTO = -71;
export const EMULTIHOP = -72;
export const EDOTDOT = -73;
export const EBADMSG = -74;
export const EOVERFLOW = -75;
export const ENOTUNIQ = -76;
export const EBADFD = -77;
export const EREMCHG = -78;
export const ELIBACC = -79;
export const ELIBBAD = -80;
export const ELIBSCN = -81;
export const ELIBMAX = -82;
export const ELIBEXEC = -83;
export const EILSEQ = -84;
export const ERESTART = -85;
export const ESTRPIPE = -86;
export const EUSERS = -87;
export const ENOTSOCK = -88;
export const EDESTADDRREQ = -89;
export const EMSGSIZE = -90;
export const EPROTOTYPE = -91;
export const ENOPROTOOPT = -92;
export const EPROTONOSUPPORT = -93;
export const ESOCKTNOSUPPORT = -94;
export const EOPNOTSUPP = -95;
export const EPFNOSUPPORT = -96;
export const EAFNOSUPPORT = -97;
export const EADDRINUSE = -98;
export const EADDRNOTAVAIL = -99;
export const ENETDOWN = -100;
export const ENETUNREACH = -101;
export const ENETRESET = -102;
export const ECONNABORTED = -103;
export const ECONNRESET = -104;
export const ENOBUFS = -105;
export const EISCONN = -106;
export const ENOTCONN = -107;
export const ESHUTDOWN = -108;
export const ETOOMANYREFS = -109;
export const ETIMEDOUT = -110;
export const ECONNREFUSED = -111;
export const EHOSTDOWN = -112;
export const EHOSTUNREACH = -113;
export const EALREADY = -114;
export const EINPROGRESS = -115;
export const ESTALE = -116;
export const EUCLEAN = -117;
export const ENOTNAM = -118;
export const ENAVAIL = -119;
export const EISNAM = -120;
export const EREMOTEIO = -121;
export const EDQUOT = -122;
export const ENOMEDIUM = -123;
export const EMEDIUMTYPE = -124;

const call = function (cb) {
    cb();
};

const IS_OSX = os.platform() === "darwin";
const OSX_FOLDER_ICON = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericFolderIcon.icns";
const HAS_FOLDER_ICON = IS_OSX && fs.existsSync(OSX_FOLDER_ICON);

native.setCallback((index, callback) => {
    return callback.bind(null, index);
});

export const context = function () {
    const ctx = {};
    native.populateContext(ctx);
    return ctx;
};

export const unmount = (mnt) => new Promise((resolve, reject) => {
    native.unmount(path.resolve(mnt), (err) => {
        // ignore errors ?
        resolve();
    });
});

export const errno = function (code) {
    return (code && exports[code.toUpperCase()]) || -1;
};

export const mount = async (mnt, ops = {}, opts = {}) => {
    Object.assign(ops, opts);
    if (/\*|(^,)fuse-bindings(,$)/.test(process.env.DEBUG)) {
        ops.options = ["debug"].concat(ops.options || []);
    }
    mnt = path.resolve(mnt);

    if (ops.displayFolder && IS_OSX) { // only works on osx
        if (!ops.options) {
            ops.options = [];
        }
        ops.options.push(`volname=${path.basename(mnt)}`);
        if (HAS_FOLDER_ICON) {
            ops.options.push(`volicon=${OSX_FOLDER_ICON}`);
        }
    }

    if (ops.force) {
        await unmount(mnt);
    }

    const init = new Promise((resolve, reject) => {
        const init = ops.init || ((next) => next());

        ops.init = function (next) {
            resolve();
            if (init.length > 1) {
                init(mnt, next); // backwards compat for now
            } else {
                init(next);
            }
        };

        const error = ops.error || call;
        ops.error = function (next) {
            reject(new Error("Mount failed"));
            error(next);
        };
    });

    if (!ops.getattr) { // we need this for unmount to work on osx
        ops.getattr = function (path, cb) {
            if (path !== "/") {
                return cb(EPERM);
            }
            cb(null, { mtime: new Date(0), atime: new Date(0), ctime: new Date(0), mode: 16877, size: 4096 });
        };
    }

    // TODO: I got a feeling this can be done better
    if (os.platform() !== "win32") {
        let stat;
        try {
            stat = await fs.stat(mnt);
        } catch (err) {
            if (err.code === "ENOENT") {
                throw new exception.IllegalState(`Mountpoint does not exist: ${mnt}`);
            }
            throw err;
        }
        if (!stat.isDirectory()) {
            throw new exception.IllegalState(`Mountpoint is not a directory: ${mnt}`);
        }
        const parent = await fs.stat(path.join(mnt, ".."));
        if (parent.dev !== stat.dev) {
            throw new exception.IllegalState("Mountpoint in use");
        }
        native.mount(mnt, ops);
    } else {
        native.mount(mnt, ops);
    }

    await init;
};
