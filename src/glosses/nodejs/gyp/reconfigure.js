const {
    nodejs: { gyp }
} = adone;
export default async (options) => {
    await gyp.clean({
        realm: options.realm,
        path: options.path
    });
    return gyp.configure(options);
};

