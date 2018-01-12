export default (ctx) => {
    const {
        std
    } = adone;

    const fixtures = std.path.join(__dirname, "fixtures");
    ctx.runtime.file1 = std.path.join(fixtures, "file1.txt");
    ctx.runtime.file2 = std.path.join(fixtures, "file2.txt");
};
