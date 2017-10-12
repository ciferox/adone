const {
    fs: { lock },
    std: { fs }
} = adone;

const file = `${__dirname}/../tmp`;

fs.writeFileSync(file, "");

lock(file, (err) => {
    if (err) {
        process.exit(25);
    }

    throw new Error("c1r1a1sh");
});
