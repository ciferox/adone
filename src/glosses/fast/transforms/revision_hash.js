// @flow



const { x, std: { crypto, path, fs }, is, fast: { Fast, File } } = adone;

function transformFilename(file) {
    file.revOrigPath = file.path;
    file.revOrigBase = file.base;
    file.revHash = crypto.createHash("md5").update(file.contents).digest("hex").slice(0, 10);
    const { stem } = file;
    const extindex = stem.indexOf(".");
    file.stem = extindex === -1 ? `${stem}-${file.revHash}` : `${stem.slice(0, extindex)}-${file.revHash}${stem.slice(extindex)}`;
}

export function rev() {
    const sourcemaps = [];
    const pathMap = {};

    return new Fast(null, {
        transform(file) {
            if (file.isNull()) {
                this.push(file);
                return;
            }
            if (file.isStream()) {
                throw new x.NotSupported("Streaming is not supported");
            }
            if (file.extname === ".map") {
                sourcemaps.push(file);
                return;
            }
            const oldPath = file.path;
            transformFilename(file);
            pathMap[oldPath] = file.revHash;
            this.push(file);
        },
        flush() {
            for (const file of sourcemaps) {
                let reverseFilename;
                try {
                    reverseFilename = path.resolve(file.dirname, JSON.parse(file.contents.toString()).file);
                } catch (err) {
                    //
                }
                if (!reverseFilename) {
                    reverseFilename = path.resolve(file.dirname, file.stem);
                }
                if (pathMap[reverseFilename]) {
                    file.revOrigPath = file.path;
                    file.revOrigBase = file.base;
                    const hash = pathMap[reverseFilename];
                    let p = file.path.slice(0, -4);  // .map
                    const ext = path.extname(p);
                    p = path.join(file.dirname, path.basename(p, ext));
                    file.path = `${p}-${hash}${ext}.map`;
                } else {
                    transformFilename(file);
                }
                this.push(file);
            }
        }
    });
}

async function getManifestFile(opts) {
    const file = new File(opts);
    try {
        const data = await fs.readFileAsync(opts.path);
        file.contents = data;
    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
    return file;
}

function relPath(base, filePath) {
    if (filePath.indexOf(base) !== 0) {
        return filePath.replace(/\\/g, "/");
    }

    const newPath = filePath.slice(base.length).replace(/\\/g, "/");

    if (newPath[0] === "/") {
        return newPath.slice(1);
    }
    return newPath;
}

export function manifest(pth, opts) {
    if (is.string(pth)) {
        pth = { path: pth };
    }

    opts = Object.assign({
        path: "rev-manifest.json",
        merge: false,
        transformer: JSON
    }, opts, pth);

    let manifest = {};

    return new Fast(null, {
        transform(file) {
            // ignore all non-rev'd files
            if (!file.path || !file.revOrigPath) {
                return;
            }
            const revisionedFile = relPath(file.base, file.path);
            const originalFile = path.join(path.dirname(revisionedFile), path.basename(file.revOrigPath)).replace(/\\/g, "/");
            manifest[originalFile] = revisionedFile;
        },
        async flush() {
            // no need to write a manifest file if there's nothing to manifest
            if (Object.keys(manifest).length === 0) {
                return;
            }
            const manifestFile = await getManifestFile(opts);
            if (opts.merge && !manifestFile.isNull()) {
                let oldManifest = {};

                try {
                    oldManifest = opts.transformer.parse(manifestFile.contents.toString());
                } catch (err) {
                    //
                }

                manifest = Object.assign(oldManifest, manifest);
            }
            manifestFile.contents = Buffer.from(opts.transformer.stringify(adone.util.sortKeys(manifest), null, "  "));
            this.push(manifestFile);
        }
    });
}
