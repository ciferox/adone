const {
    cli: { style },
    error,
    configuration,
    is,
    fs,
    std,
    realm
} = adone;

export default class extends realm.BaseTask {
    async run(obj, { symlink = false } = {}) {
        let manager;
        if (is.realm(obj)) {
            manager = obj;
        } else if (is.string(obj)) {
            manager = new realm.Manager({
                cwd: obj
            });
        } else {
            throw new adone.error.InvalidArgumentException("Target realm should be specified by instance ot path realm root");
        }

        
    }
}
