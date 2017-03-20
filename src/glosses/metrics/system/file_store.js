export default class FileStore {
    constructor(name, volume, mount, description, fsType, uuid, freeSpace, totalSpace) {
        this.name = name;
        this.volume = volume;
        this.mount = mount;
        this.description = description;
        this.fsType = fsType;
        this.uuid = uuid;
        this.freeSpace = freeSpace;
        this.totalSpace = totalSpace;
    }
}
