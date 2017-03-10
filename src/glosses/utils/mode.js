// @flow



/**
 * Constants (defined in `stat.h`).
 */

const S_IFMT = 61440;   /* 0170000 type of file */
const S_IFIFO = 4096;   /* 0010000 named pipe (fifo) */
const S_IFCHR = 8192;   /* 0020000 character special */
const S_IFDIR = 16384;  /* 0040000 directory */
const S_IFBLK = 24576;  /* 0060000 block special */
const S_IFREG = 32768;  /* 0100000 regular */
const S_IFLNK = 40960;  /* 0120000 symbolic link */
const S_IFSOCK = 49152; /* 0140000 socket */
const S_IFWHT = 57344;  /* 0160000 whiteout */
const S_ISUID = 2048;   /* 0004000 set user id on execution */
const S_ISGID = 1024;   /* 0002000 set group id on execution */
const S_ISVTX = 512;    /* 0001000 save swapped text even after use */
const S_IRUSR = 256;    /* 0000400 read permission, owner */
const S_IWUSR = 128;    /* 0000200 write permission, owner */
const S_IXUSR = 64;     /* 0000100 execute/search permission, owner */
const S_IRGRP = 32;     /* 0000040 read permission, group */
const S_IWGRP = 16;     /* 0000020 write permission, group */
const S_IXGRP = 8;      /* 0000010 execute/search permission, group */
const S_IROTH = 4;      /* 0000004 read permission, others */
const S_IWOTH = 2;      /* 0000002 write permission, others */
const S_IXOTH = 1;      /* 0000001 execute/search permission, others */

/**
 * `Mode` class.
 *
 * @param {fs.Stat} stat a "stat" object (anything with a `mode` Number property)
 * @api public
 */
export default class Mode {
    constructor(stat) {
        if (!stat) {
            throw new adone.x.InvalidArgument("You must pass in a \"stat\" object");
        }
        if (!adone.is.number(stat.mode)) {
            stat.mode = 0;
        }
        this.stat = stat;
        this.owner = new Owner(stat);
        this.group = new Group(stat);
        this.others = new Others(stat);
    }

    /**
     * Returns the Number value of the `mode`.
     *
     * @return {Number}
     * @api public
     */
    valueOf(): number {
        return this.stat.mode;
    }

    /**
     * Returns a String representation of the `mode`.
     * The output resembles something similiar to what `ls -l` would output.
     *
     * http://en.wikipedia.org/wiki/Unix_file_types
     *
     * @return {String}
     * @api public
     */

    toString() {
        const str = [];

        // file type
        if (this.isDirectory()) {
            str.push("d");
        } else if (this.isFile()) {
            str.push("-");
        } else if (this.isBlockDevice()) {
            str.push("b");
        } else if (this.isCharacterDevice()) {
            str.push("c");
        } else if (this.isSymbolicLink()) {
            str.push("l");
        } else if (this.isFIFO()) {
            str.push("p");
        } else if (this.isSocket()) {
            str.push("s");
        } else {
            throw new TypeError("unexpected \"file type\"");
        }

        // owner read, write, execute
        str.push(this.owner.read ? "r" : "-");
        str.push(this.owner.write ? "w" : "-");
        if (this.setuid) {
            str.push(this.owner.execute ? "s" : "S");
        } else {
            str.push(this.owner.execute ? "x" : "-");
        }

        // group read, write, execute
        str.push(this.group.read ? "r" : "-");
        str.push(this.group.write ? "w" : "-");
        if (this.setgid) {
            str.push(this.group.execute ? "s" : "S");
        } else {
            str.push(this.group.execute ? "x" : "-");
        }

        // others read, write, execute
        str.push(this.others.read ? "r" : "-");
        str.push(this.others.write ? "w" : "-");
        if (this.sticky) {
            str.push(this.others.execute ? "t" : "T");
        } else {
            str.push(this.others.execute ? "x" : "-");
        }

        return str.join("");
    }

    /**
     * Returns an octal representation of the `mode`, eg. "0754".
     *
     * http://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation
     *
     * @return {String}
     * @api public
     */

    toOctal() {
        const octal = this.stat.mode & 4095;
        return ("0000" + octal.toString(8)).slice(-4);
    }

    _checkModeProperty(property, set) {
        const mode = this.stat.mode;
        if (set) {
            this.stat.mode = (mode | S_IFMT) & property | mode & ~S_IFMT;
        }
        return (mode & S_IFMT) === property;
    }

    isDirectory(v) {
        return this._checkModeProperty(S_IFDIR, v);
    }

    isFile(v) {
        return this._checkModeProperty(S_IFREG, v);
    }

    isBlockDevice(v) {
        return this._checkModeProperty(S_IFBLK, v);
    }

    isCharacterDevice(v) {
        return this._checkModeProperty(S_IFCHR, v);
    }

    isSymbolicLink(v) {
        return this._checkModeProperty(S_IFLNK, v);
    }

    isFIFO(v) {
        return this._checkModeProperty(S_IFIFO, v);
    }

    isSocket(v) {
        return this._checkModeProperty(S_IFSOCK, v);
    }

    get setuid() {
        return Boolean(this.stat.mode & S_ISUID);
    }

    set setuid(v) {
        if (v) {
            this.stat.mode |= S_ISUID;
        } else {
            this.stat.mode &= ~S_ISUID;
        }
    }

    get setgid() {
        return Boolean(this.stat.mode & S_ISGID);
    }

    set setgid(v) {
        if (v) {
            this.stat.mode |= S_ISGID;
        } else {
            this.stat.mode &= ~S_ISGID;
        }
    }

    get sticky() {
        return Boolean(this.stat.mode & S_ISVTX);
    }

    set sticky(v) {
        if (v) {
            this.stat.mode |= S_ISVTX;
        } else {
            this.stat.mode &= ~S_ISVTX;
        }
    }
}

class Owner {
    constructor(stat) {
        this.stat = stat;
    }

    get read() {
        return Boolean(this.stat.mode & S_IRUSR);
    }

    set read(v) {
        if (v) {
            this.stat.mode |= S_IRUSR;
        } else {
            this.stat.mode &= ~S_IRUSR;
        }
    }

    get write() {
        return Boolean(this.stat.mode & S_IWUSR);
    }

    set write(v) {
        if (v) {
            this.stat.mode |= S_IWUSR;
        } else {
            this.stat.mode &= ~S_IWUSR;
        }
    }

    get execute() {
        return Boolean(this.stat.mode & S_IXUSR);
    }

    set execute(v) {
        if (v) {
            this.stat.mode |= S_IXUSR;
        } else {
            this.stat.mode &= ~S_IXUSR;
        }
    }
}

class Group {
    constructor(stat) {
        this.stat = stat;
    }

    get read() {
        return Boolean(this.stat.mode & S_IRGRP);
    }

    set read(v) {
        if (v) {
            this.stat.mode |= S_IRGRP;
        } else {
            this.stat.mode &= ~S_IRGRP;
        }
    }

    get write() {
        return Boolean(this.stat.mode & S_IWGRP);
    }

    set write(v) {
        if (v) {
            this.stat.mode |= S_IWGRP;
        } else {
            this.stat.mode &= ~S_IWGRP;
        }
    }

    get execute() {
        return Boolean(this.stat.mode & S_IXGRP);
    }

    set execute(v) {
        if (v) {
            this.stat.mode |= S_IXGRP;
        } else {
            this.stat.mode &= ~S_IXGRP;
        }
    }
}

class Others {
    constructor(stat) {
        this.stat = stat;
    }

    get read() {
        return Boolean(this.stat.mode & S_IROTH);
    }

    set read(v) {
        if (v) {
            this.stat.mode |= S_IROTH;
        } else {
            this.stat.mode &= ~S_IROTH;
        }
    }

    get write() {
        return Boolean(this.stat.mode & S_IWOTH);
    }

    set write(v) {
        if (v) {
            this.stat.mode |= S_IWOTH;
        } else {
            this.stat.mode &= ~S_IWOTH;
        }
    }

    get execute() {
        return Boolean(this.stat.mode & S_IXOTH);
    }

    set execute(v) {
        if (v) {
            this.stat.mode |= S_IXOTH;
        } else {
            this.stat.mode &= ~S_IXOTH;
        }
    }
}