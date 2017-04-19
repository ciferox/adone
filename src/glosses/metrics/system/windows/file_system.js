
const { is } = adone;

export default class WindowsFS extends adone.metrics.FileSystem {
    getFileStores() {
        const stores = [];
        const volumes = adone.metrics.native.getLocalVolumes();

        for (let i = 0; i < volumes.length; i++) {
            const volume = volumes[i];
            let uuid = "";
            const result = /.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}).*/.exec(volume.volume);
            
            if (!is.null(result)) {
                uuid = result[1];
            }
            let name;
            if (volume.name.length > 0) {
                name = adone.sprintf("%s (%s)", volume.name, volume.mount);
            } else {
                name = volume.mount;
            }
            stores.push(new adone.metrics.FileStore(name, volume.volume, volume.mount, volume.description, volume.fsType, uuid, volume.freeSpace, volume.totalSpace));
        }

        return stores;
    }

    getOpenFileDescriptors() {
        return 0;
    }

    getMaxFileDescriptors() {
        return 0;
    }
}
