
import bowerConfig from "bower-config";
import fileTypesDefault from "./default-file-types";
import HelperStore from "./helper-store";
import detectDependencies from "./detect-dependencies";
import injectDependencies from "./inject-dependencies";

const { fast: { Fast } } = adone;

let config;

/**
 * Wire up the html files with the Bower packages.
 *
 * @param    {object} config    the global configuration object
 */
async function wiredep(options = {}) {
    const cwd = options.cwd ? adone.std.path.resolve(options.cwd) : process.cwd();

    config = new HelperStore();

    config.set
        ("on-file-updated", options.onFileUpdated || () => { })
        ("on-main-not-found", options.onMainNotFound || () => { })
        ("on-path-injected", options.onPathInjected || () => { });

    config.set
        ("bower.json", options.bowerJson || JSON.parse(await adone.fs.readFile(adone.std.path.join(cwd, "./bower.json"))))
        ("bower-directory", options.directory || findBowerDirectory(cwd))
        ("cwd", cwd)
        ("dependencies", options.dependencies === false ? false : true)
        ("detectable-file-types", [])
        ("dev-dependencies", options.devDependencies)
        ("exclude", adone.is.array(options.exclude) ? options.exclude : [options.exclude])
        ("file-types", mergeFileTypesWithDefaults(options.fileTypes))
        ("global-dependencies", new HelperStore())
        ("ignore-path", options.ignorePath)
        ("include-self", options.includeSelf)
        ("overrides", adone.vendor.lodash.extend({}, config.get("bower.json").overrides, options.overrides))
        ("src", [])
        ("stream", options.stream ? options.stream : {});

    adone.vendor.lodash.map(config.get("file-types"), "detect").
        forEach((fileType) => {
            adone.util.keys(fileType)
                .forEach((detectableFileType) => {
                    const detectableFileTypes = config.get("detectable-file-types");

                    if (detectableFileTypes.indexOf(detectableFileType) === -1) {
                        config.set("detectable-file-types", detectableFileTypes.concat(detectableFileType));
                    }
                });
        });

    if (!options.stream && options.src) {
        for (const pattern of (adone.is.array(options.src) ? options.src : [options.src])) {
            config.set("src", config.get("src").concat(await adone.fs.glob(pattern)));
        }
    }

    await detectDependencies(config);
    await injectDependencies(config);

    return config.get("stream").src ||
        adone.util.keys(config.get("global-dependencies-sorted"))
            .reduce((acc, depType) => {
                if (config.get("global-dependencies-sorted")[depType].length) {
                    acc[depType] = config.get("global-dependencies-sorted")[depType];
                }

                return acc;
            }, { packages: config.get("global-dependencies").get() });
}

function mergeFileTypesWithDefaults(optsFileTypes) {
    const fileTypes = adone.vendor.lodash.clone(fileTypesDefault, true);

    adone.vendor.lodash(optsFileTypes).each((fileTypeConfig, fileType) => {
        // fallback to the default type for all html-like extensions (php, twig, hbs, etc)
        fileTypes[fileType] = fileTypes[fileType] || fileTypes.default;
        adone.vendor.lodash.each(fileTypeConfig, (config, configKey) => {
            if (adone.vendor.lodash.isPlainObject(fileTypes[fileType][configKey])) {
                fileTypes[fileType][configKey] =
                    adone.vendor.lodash.assign(fileTypes[fileType][configKey], config);
            } else {
                fileTypes[fileType][configKey] = config;
            }
        });
    });

    return fileTypes;
}

function findBowerDirectory(cwd) {
    const directory = adone.std.path.join(cwd, (bowerConfig.read(cwd).directory || "bower_components"));
    if (!adone.fs.exists(directory)) {
        const error = new adone.x.NotFound("Cannot find where you keep your Bower packages.");
        error.code = "BOWER_COMPONENTS_MISSING";
        throw error;
    }

    return directory;
}

wiredep.stream = (options = {}) => new Fast(null, {
    async transform(file) {
        if (file.isNull()) {
            this.push(file);
            return;
        }

        if (file.isStream()) {
            throw new adone.x.NotSupported("Streaming not supported");
        }

        options = adone.o(options, {
            stream: {
                src: file.contents.toString(),
                path: file.path,
                fileType: adone.std.path.extname(file.path).slice(1)
            }
        });

        file.contents = new Buffer(await wiredep(options));

        this.push(file);
    }
});

export default wiredep;
export { config };
