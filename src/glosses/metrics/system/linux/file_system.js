
const { is } = adone;

export default class LinuxFS extends adone.metrics.FileSystem {
    async getFileStores() {
        const uuidMap = new Map();
        const isDir = await adone.fs.is.directory("/dev/disk/by-uuid");
        if (isDir) {
            const files = await adone.fs.glob("/dev/disk/by-uuid/*");
            for (const file of files) {
                let realPath = await adone.fs.realpath(file);
                realPath = adone.std.path.normalize(realPath);
                uuidMap.set(realPath, adone.std.path.basename(file).toLowerCase());
            }
        }

        const stores = [];
        const mounts = await adone.fs.readLines("/proc/self/mounts");
        if (is.null(mounts)) {
            return stores;
        }

        for (const mount of mounts) {
            const parts = mount.split(" ");
            // structure from fstab(5) manpage
            if (parts.length < 6) {
                continue; 
            }
            const path = parts[1].replace(/\\040/g, " ");
            const type = parts[2];
            if (LinuxFS.pseudofs.includes(type) || path === "/dev" || this._listElementStartsWith(LinuxFS.tmpfsPaths, path)) {
                continue;
            }

            const volume = parts[0].replace(/\\040/g, " "); 
            let name = volume;
            if (path === "/") {
                name = "/";
            }
            
            let uuid;
            if (uuidMap.has(parts[0])) {
                uuid = uuidMap.get(parts[0]);
            } else {
                uuid = "";
            }
            const diskInfo = await adone.metrics.native.diskCheck(path);
            const totalSpace = diskInfo.total;
            const usableSpace = diskInfo.total - diskInfo.free;
            let description;
            if (volume.startsWith("/dev")) {
                description = "Local Disk";
            } else if (volume === "tmpfs") {
                description = "Ram Disk";
            } else if (type.startsWith("nfs") || type === "cifs") {
                description = "Network Disk";
            } else {
                description = "Mount Point";
            }

            stores.push(new adone.metrics.FileStore(name, volume, path, description, type, uuid, totalSpace - usableSpace, totalSpace));
        }
        return stores;
    }

    getOpenFileDescriptors() {
        return this._getFileDescriptors(0);
    }

    getMaxFileDescriptors() {
        return this._getFileDescriptors(2);
    }

    async _getFileDescriptors(index) {
        const filepath = "/proc/sys/fs/file-nr";
        if (index < 0 || index > 2) {
            throw new adone.x.InvalidArgument("index must be between 0 and 2");
        }
        const lines = await adone.fs.readLines(filepath);
        if (!is.null(lines) && lines.length > 0) {
            const parts = lines[0].split(/\D+/);
            return Number.parseInt(parts[index], 10); 
        }
    }

    _listElementStartsWith(aList, charSeq) {
        for (const match of aList) {
            if (charSeq === match || charSeq.startsWith(`${match}/`)) {
                return true;
            }
        }
        return false;
    }
}

LinuxFS.pseudofs = [
    "rootfs", // Minimal fs to support kernel boot
    "sysfs", // SysFS file system
    "proc", // Proc file system
    "devtmpfs", // Dev temporary file system
    "devpts", // Dev pseudo terminal devices file system
    "securityfs", // Kernel security file system
    "cgroup", // Cgroup file system
    "pstore", // Pstore file system
    "hugetlbfs", // Huge pages support file system
    "configfs", // Config file system
    "selinuxfs", // SELinux file system
    "systemd-1", // Systemd file system
    "binfmt_misc", // Binary format support file system
    "mqueue", // Message queue file system
    "debugfs", // Debug file system
    "nfsd", // NFS file system
    "sunrpc", // Sun RPC file system
    "rpc_pipefs", // Sun RPC file system
    "fusectl" // FUSE control file system
];
LinuxFS.tmpfsPaths = ["/dev/shm", "/run", "/sys", "/proc"];
