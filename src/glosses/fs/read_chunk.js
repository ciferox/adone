const {
    promise,
    std: { fs }
} = adone;

const fsOpen = promise.promisify(fs.open);
const fsClose = promise.promisify(fs.close);
const fsRead = promise.promisify(fs.read, { multiArgs: true });

const withOpenFile = (...args) => {
    const callback = args.pop();
    return fsOpen(...args).then((fd) => promise.finally(promise.try(callback, fd), (_) => fsClose(fd)));
};

const withOpenFileSync = (...args) => {
    const callback = args.pop();
    const fd = fs.openSync(...args);
    try {
        return callback(fd);
    } finally {
        fs.closeSync(fd);
    }
};

const readChunk = (filePath, startPosition, length) => {
    const buffer = Buffer.alloc(length);

    return withOpenFile(filePath, "r", (fileDescriptor) => fsRead(fileDescriptor, buffer, 0, length, startPosition)).then(([bytesRead, buffer]) => {
        if (bytesRead < length) {
            buffer = buffer.slice(0, bytesRead);
        }

        return buffer;
    });
};

readChunk.sync = (filePath, startPosition, length) => {
    let buffer = Buffer.alloc(length);

    const bytesRead = withOpenFileSync(filePath, "r", (fileDescriptor) =>
        fs.readSync(fileDescriptor, buffer, 0, length, startPosition)
    );

    if (bytesRead < length) {
        buffer = buffer.slice(0, bytesRead);
    }

    return buffer;
};


export default readChunk;
