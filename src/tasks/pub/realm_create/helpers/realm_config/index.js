const {
    realm
} = adone;

export const create = async ({ cwd, ext, ...props }) => {
    const config = new realm.Configuration({
        cwd
    });
    config.merge(props);
    return config.save({ ext });
};

export const load = async ({ cwd } = {}) => realm.Configuration.load({ cwd });

export const createDev = async ({ cwd, ext, ...props } = {}) => {
    const config = new realm.DevConfiguration({
        cwd
    });

    config.merge(props);
    return config.save({ ext });
};
