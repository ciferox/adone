export default (fs) => {
    const {
        path
    } = adone;
    
    return (file) => {
        let stats;
        try {
            stats = fs.statSync(file);
        } catch (e) {
            //
        }
        if (stats && stats.isFile()) {
            return;
        }
    
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            fs.mkdirpSync(dir);
        }
    
        fs.writeFileSync(file, "");
    };  
};
