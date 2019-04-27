const {
    fs,
    std
} = adone;

export default async (ctx) => {
    ctx.after(async () => {
        await fs.remove(std.path.join(__dirname, "prototype/build"));
        await fs.remove(std.path.join(__dirname, "prototype2/build"));
    });
};
