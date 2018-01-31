const {
    fake
} = adone;

/**
 * generates a file name with extension or optional type
 *
 * @method fake.system.fileName
 * @param {string} ext
 * @param {string} type
 */
export const fileName = function (ext, type) {
    let str = fake.fake("{{random.words}}.{{system.fileExt}}");
    str = str.replace(/ /g, "_");
    str = str.replace(/\,/g, "_");
    str = str.replace(/\-/g, "_");
    str = str.replace(/\\/g, "_");
    str = str.replace(/\//g, "_");
    str = str.toLowerCase();
    return str;
};

/**
 * commonFileName
 *
 * @method fake.system.commonFileName
 * @param {string} ext
 * @param {string} type
 */
export const commonFileName = function (ext, type) {
    let str = `${fake.random.words()}.${ext || fake.system.commonFileExt()}`;
    str = str.replace(/ /g, "_");
    str = str.replace(/\,/g, "_");
    str = str.replace(/\-/g, "_");
    str = str.replace(/\\/g, "_");
    str = str.replace(/\//g, "_");
    str = str.toLowerCase();
    return str;
};

/**
 * mimeType
 *
 * @method fake.system.mimeType
 */
export const mimeType = function () {
    return fake.random.arrayElement(Object.keys(fake.definitions.system.mimeTypes));
};

/**
 * returns a commonly used file type
 *
 * @method fake.system.commonFileType
 */
export const commonFileType = function () {
    const types = ["video", "audio", "image", "text", "application"];
    return fake.random.arrayElement(types);
};

/**
 * returns a commonly used file extension based on optional type
 *
 * @method fake.system.commonFileExt
 * @param {string} type
 */
export const commonFileExt = function (type) {
    const types = [
        "application/pdf",
        "audio/mpeg",
        "audio/wav",
        "image/png",
        "image/jpeg",
        "image/gif",
        "video/mp4",
        "video/mpeg",
        "text/html"
    ];
    return fake.system.fileExt(fake.random.arrayElement(types));
};


/**
 * returns any file type available as mime-type
 *
 * @method fake.system.fileType
 */
export const fileType = function () {
    const types = [];
    const mimes = fake.definitions.system.mimeTypes;
    Object.keys(mimes).forEach((m) => {
        const parts = m.split("/");
        if (types.indexOf(parts[0]) === -1) {
            types.push(parts[0]);
        }
    });
    return fake.random.arrayElement(types);
};

/**
 * fileExt
 *
 * @method fake.system.fileExt
 * @param {string} mimeType
 */
export const fileExt = function (mimeType) {
    const exts = [];
    const mimes = fake.definitions.system.mimeTypes;

    // get specific ext by mime-type
    if (typeof mimes[mimeType] === "object") {
        return fake.random.arrayElement(mimes[mimeType].extensions);
    }

    // reduce mime-types to those with file-extensions
    Object.keys(mimes).forEach((m) => {
        if (mimes[m].extensions instanceof Array) {
            mimes[m].extensions.forEach((ext) => {
                exts.push(ext);
            });
        }
    });
    return fake.random.arrayElement(exts);
};

/**
 * returns directory path
 *
 * @method fake.system.directoryPath
 */
export const directoryPath = function () {
    const paths = fake.definitions.system.directoryPaths;
    return fake.random.arrayElement(paths);
};

/**
 * returns file path
 *
 * @method fake.system.filePath
 */
export const filePath = function () {
    return fake.fake("{{system.directoryPath}}/{{system.fileName}}");
};

/**
 * semver
 *
 * @method fake.system.semver
 */
export const semver = function () {
    return [fake.random.number(9), fake.random.number(9), fake.random.number(9)].join(".");
};
