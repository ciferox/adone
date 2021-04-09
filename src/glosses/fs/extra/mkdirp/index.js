import { checkPath, processOptions } from "./utils";

const {
    is,
    std: { path }
} = adone;

export default (fs) => {
    const mkdirp = (input, options, callback) => {
        checkPath(input);
        if (is.function(options)) {
            callback = options;
            options = null;
        }
        options = processOptions(options);
        
        const pth = path.resolve(input);

        return fs.mkdir(pth, {
            mode: options.mode,
            recursive: true
        }, callback);
    };

    return mkdirp;
};
