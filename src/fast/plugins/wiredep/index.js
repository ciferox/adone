import bowerConfig from "bower-config";

const { lazify, vendor, fs, util, std: { path }, is, x, noop } = adone;

const lazy = lazify({
    fileTypesDefault: "./default_file_types",
    HelperStore: "./helper_store",
    detectDependencies: "./detect_dependencies",
    injectDependencies: "./inject_dependencies"
}, exports, require);

const mergeFileTypesWithDefaults = (optsFileTypes) => {
    const fileTypes = vendor.lodash.cloneDeep(lazy.fileTypesDefault, true);

    vendor.lodash(optsFileTypes).each((fileTypeConfig, fileType) => {
        // fallback to the default type for all html-like extensions (php, twig, hbs, etc)
        fileTypes[fileType] = fileTypes[fileType] || fileTypes.default;
        vendor.lodash.each(fileTypeConfig, (config, configKey) => {
            if (vendor.lodash.isPlainObject(fileTypes[fileType][configKey])) {
                fileTypes[fileType][configKey] =
                    vendor.lodash.assign(fileTypes[fileType][configKey], config);
            } else {
                fileTypes[fileType][configKey] = config;
            }
        });
    });

    return fileTypes;
};

const findBowerDirectory = async (cwd) => {
    const directory = path.join(cwd, (bowerConfig.read(cwd).directory || "bower_components"));
    if (!await fs.exists(directory)) {
        const error = new x.NotFound("Cannot find where you keep your Bower packages.");
        error.code = "BOWER_COMPONENTS_MISSING";
        throw error;
    }

    return directory;
};


export const wiredep = async (options = {}) => {
    const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();

    const config = new Map();

    config.set("on-file-updated", options.onFileUpdated || noop);
    config.set("on-main-not-found", options.onMainNotFound || noop);
    config.set("on-path-injected", options.onPathInjected || noop);

    config.set("bower.json", options.bowerJson || JSON.parse(await fs.readFile(path.join(cwd, "./bower.json"))));
    config.set("bower-directory", options.directory || await findBowerDirectory(cwd));
    config.set("cwd", cwd);
    config.set("dependencies", options.dependencies === false ? false : true);
    config.set("detectable-file-types", []);
    config.set("dev-dependencies", options.devDependencies);
    config.set("exclude", is.array(options.exclude) ? options.exclude : [options.exclude]);
    config.set("file-types", mergeFileTypesWithDefaults(options.fileTypes));
    config.set("global-dependencies", new lazy.HelperStore());
    config.set("ignore-path", options.ignorePath);
    config.set("include-self", options.includeSelf);
    config.set("overrides", vendor.lodash.extend({}, config.get("bower.json").overrides, options.overrides));
    config.set("src", []);
    config.set("stream", options.stream ? options.stream : {});

    vendor.lodash.map(config.get("file-types"), "detect").
        forEach((fileType) => {
            util.keys(fileType)
                .forEach((detectableFileType) => {
                    const detectableFileTypes = config.get("detectable-file-types");

                    if (detectableFileTypes.indexOf(detectableFileType) === -1) {
                        config.set("detectable-file-types", detectableFileTypes.concat(detectableFileType));
                    }
                });
        });

    if (!options.stream && options.src) {
        for (const pattern of (is.array(options.src) ? options.src : [options.src])) {
            config.set("src", config.get("src").concat(await fs.glob(pattern)));
        }
    }

    await lazy.detectDependencies(config);
    await lazy.injectDependencies(config);

    return config.get("stream").src ||
        util.keys(config.get("global-dependencies-sorted"))
            .reduce((acc, depType) => {
                if (config.get("global-dependencies-sorted")[depType].length) {
                    acc[depType] = config.get("global-dependencies-sorted")[depType];
                }

                return acc;
            }, { packages: config.get("global-dependencies").get() });
};


export default function plugin() {
    return function (options) {
        return this.throughAsync(async function (file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }

            if (file.isStream()) {
                throw new x.NotSupported("Streaming not supported");
            }

            options = {
                ...options,
                stream: {
                    src: file.contents.toString(),
                    path: file.path,
                    fileType: path.extname(file.path).slice(1)
                }
            };

            file.contents = Buffer.from(await wiredep(options));

            this.push(file);
        });
    };
}
