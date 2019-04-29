const {
    nodejs: { gyp }
} = adone;
export default async (options) => {
    await gyp.clean({
        realm: options.realm,
        path: options.path
    });
    await gyp.configure(options);
    return gyp.build(options);
};

