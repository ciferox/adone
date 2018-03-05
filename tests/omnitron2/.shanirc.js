const {
    is,
    fs,
    std
} = adone;

const SYM_LINKS = [
    "bin",
    "lib",
    "etc"
];

export default async (ctx) => {
    let tmpPath;
    ctx.before(async () => {
        tmpPath = await fs.tmpName({
            prefix: "realm-"
        });
        await fs.mkdirp(tmpPath);

        for (const sl of SYM_LINKS) {
            await fs.symlink(std.path.join(adone.ROOT_PATH, sl), std.path.join(tmpPath, sl), is.windows ? "junction" : undefined); // eslint-disable-line
        }

        // await realm.init(".adone_test");
        // await realm.clean();

        // realmManager = await realm.getManager();
        // adone.cli.kit.setSilent(true);
    });

    ctx.after(async () => {
        // await fs.rm(tmpPath);
        // await realm.clean();
    });
};
