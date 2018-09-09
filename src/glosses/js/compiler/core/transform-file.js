// @flow
import fs from "fs";

import loadConfig, { type InputOptions } from "./config";
import {
    runSync,
    runAsync,
    type FileResult,
    type FileResultCallback
} from "./transformation";

const {
    is
} = adone;

type TransformFile = {
  (filename: string, callback: FileResultCallback): void,
  (filename: string, opts: ?InputOptions, callback: FileResultCallback): void,
};

export const transformFile: TransformFile = (function transformFile(
    filename,
    opts,
    callback,
) {
    let options;
    if (is.function(opts)) {
        callback = opts;
        opts = undefined;
    }

    if (is.nil(opts)) {
        options = { filename };
    } else if (opts && typeof opts === "object") {
        options = {
            ...opts,
            filename
        };
    }

    process.nextTick(() => {
        let cfg;
        try {
            cfg = loadConfig(options);
            if (is.null(cfg)) {
                return callback(null, null);
            }
        } catch (err) {
            return callback(err);
        }

        // Reassignment to keep Flow happy.
        const config = cfg;

        fs.readFile(filename, "utf8", (err, code: string) => {
            if (err) {
                return callback(err, null);
            }

            runAsync(config, code, null, callback);
        });
    });
}: Function);

export function transformFileSync(
    filename: string,
    opts: ?InputOptions,
): FileResult | null {
    let options;
    if (is.nil(opts)) {
        options = { filename };
    } else if (opts && typeof opts === "object") {
        options = {
            ...opts,
            filename
        };
    }

    const config = loadConfig(options);
    if (is.null(config)) {
        return null; 
    }

    return runSync(config, fs.readFileSync(filename, "utf8"));
}

export function transformFileAsync(
    filename: string,
    opts: ?InputOptions,
): Promise<FileResult | null> {
    return new Promise((res, rej) => {
        transformFile(filename, opts, (err, result) => {
            if (is.nil(err)) {
                res(result);
            } else {
                rej(err);
            }
        });
    });
}
