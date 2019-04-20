const {
    fs2,
    path
} = adone;
const { graceful } = fs2;

export default (file) => {
    let stats;
    try {
        stats = graceful.statSync(file);
    } catch (e) {
        //
    }
    if (stats && stats.isFile()) {
        return;
    }

    const dir = path.dirname(file);
    if (!graceful.existsSync(dir)) {
        fs2.mkdirpSync(dir);
    }

    graceful.writeFileSync(file, "");
};
