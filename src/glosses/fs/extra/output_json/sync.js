export default (fs) => {
    const {
        path
    } = adone;
    
    return (file, data, options) => {
        const dir = path.dirname(file);
    
        if (!fs.existsSync(dir)) {
            fs.mkdirpSync(dir);
        }
    
        fs.writeJsonSync(file, data, options);
    };    
};
