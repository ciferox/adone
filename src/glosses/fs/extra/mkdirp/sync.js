import { checkPath, processOptions } from "./utils";

const {
    std: { path }
} = adone;

export default (fs) => {
    const mkdirpSync = (input, options) => {
        checkPath(input);
        options = processOptions(options);

        const pth = path.resolve(input);

        fs.mkdirSync(pth, {
            mode: options.mode,
            recursive: true
        });

        return pth;
    };

    return mkdirpSync;
};
