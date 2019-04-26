const {
    error,
    std: { crypto },
    is,
    fast: { File },
    path
} = adone;

const transformFilename = (file) => {
    file.revOrigPath = file.path;
    file.revOrigBase = file.base;
    file.revHash = crypto.createHash("md5").update(file.contents).digest("hex").slice(0, 10);
    const { stem } = file;
    const extindex = stem.indexOf(".");
    file.stem = extindex === -1 ? `${stem}-${file.revHash}` : `${stem.slice(0, extindex)}-${file.revHash}${stem.slice(extindex)}`;
};

export const rev = function () {
    const sourcemaps = [];
    const pathMap = {};

    return this.throughSync(function (file) {
        if (file.isNull()) {
            this.push(file);
            return;
        }
        if (file.isStream()) {
            throw new error.NotSupportedException("Streaming is not supported");
        }
        if (file.extname === ".map") {
            sourcemaps.push(file);
            return;
        }
        const oldPath = file.path;
        transformFilename(file);
        pathMap[oldPath] = file.revHash;
        this.push(file);
    }, function () {
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
                let p = file.path.slice(0, -4); // .map
                const ext = path.extname(p);
                p = path.join(file.dirname, path.basename(p, ext));
                file.path = `${p}-${hash}${ext}.map`;
            } else {
                transformFilename(file);
            }
            this.push(file);
        }
    });
};

const getManifestFile = async (opts) => {
    const file = new File(opts);
    try {
        const data = await adone.fs.readFile(opts.path);
        file.contents = data;
    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
    return file;
};

const relPath = (base, filePath) => {
    if (filePath.indexOf(base) !== 0) {
        return filePath.replace(/\\/g, "/");
    }

    const newPath = filePath.slice(base.length).replace(/\\/g, "/");

    if (newPath[0] === "/") {
        return newPath.slice(1);
    }
    return newPath;
};

export const manifest = function (pth, opts) {
    if (is.string(pth)) {
        pth = { path: pth };
    }

    opts = Object.assign({
        path: "rev-manifest.json",
        merge: false,
        transformer: JSON
    }, opts, pth);

    let manifest = {};

    return this.throughSync((file) => {
        // ignore all non-rev'd files
        if (!file.path || !file.revOrigPath) {
            return;
        }
        const revisionedFile = relPath(file.base, file.path);
        const originalFile = path.join(path.dirname(revisionedFile), path.basename(file.revOrigPath)).replace(/\\/g, "/");
        manifest[originalFile] = revisionedFile;
    }, async function () {
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
    });
};

export default function plugin() {
    return function revisionHash({ manifest: _manifest } = {}) {
        if (_manifest) {
            return manifest.call(this, _manifest);
        }
        return rev.call(this);
    };
}
