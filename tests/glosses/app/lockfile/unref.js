adone.app.run({
    async main() {
        const file = `${__dirname}/tmp`;
        
        await adone.fs.writeFileSync(file, "");
        await adone.app.lockfile.create(file);        
    }
});
