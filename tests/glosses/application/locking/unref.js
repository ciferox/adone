adone.application.run({
    async main() {
        const file = `${__dirname}/tmp`;
        
        await adone.fs.writeFileSync(file, "");
        await adone.application.locking.create(file);        
    }
});
