import stringify from "./stringify";

export default (fs) => {    
    return (file, obj, options) => {
        options = options || {};
    
        const str = stringify(obj, options);
        // not sure if fs.writeFileSync returns anything, but just in case
        return fs.writeFileSync(file, str, options);
    };    
};
