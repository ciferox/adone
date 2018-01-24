adone.application.run({
    async main() {
        const file = `${__dirname}/tmp`;
        
        await adone.fs.writeFile(file, "");

        try {
            await adone.application.lockfile.create(file);
        } catch (err) {
            return process.exit(25);
        }
    
        throw new Error("crashed");
    }
});
