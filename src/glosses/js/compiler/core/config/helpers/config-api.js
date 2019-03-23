// @flow

const {
    is,
    js: { compiler: { core } },
    semver
} = adone;

import {
    assertSimpleType,
    type CacheConfigurator,
    type SimpleCacheConfigurator
} from "../caching";

import type { CallerMetadata } from "../validation/options";

type EnvFunction = {
    (): string,
    <T>((string) => T): T,
    (string): boolean,
    (Array<string>): boolean,
};

export type PluginAPI = {
    version: string,
    cache: SimpleCacheConfigurator,
    env: EnvFunction,
    async: () => boolean,
    assertVersion: typeof assertVersion,
};

export default function makeAPI(
    cache: CacheConfigurator<{ envName: string, caller: CallerMetadata | void }>,
): PluginAPI {
    const env: any = (value) =>
        cache.using((data) => {
            if (is.undefined(value)) {
                return data.envName;
            }
            if (is.function(value)) {
                return assertSimpleType(value(data.envName));
            }
            if (!is.array(value)) {
                value = [value];
            }

            return value.some((entry) => {
                if (!is.string(entry)) {
                    throw new Error("Unexpected non-string value");
                }
                return entry === data.envName;
            });
        });

    const caller: any = (cb) =>
        cache.using((data) => assertSimpleType(cb(data.caller)));

    return {
        version: core.version,
        cache: cache.simple(),
        // Expose ".env()" so people can easily get the same env that we expose using the "env" key.
        env,
        async: () => false,
        caller,
        assertVersion,
        tokTypes: undefined
    };
}

function assertVersion(range: string | number): void {
    if (is.number(range)) {
        if (!is.integer(range)) {
            throw new Error("Expected string or integer value.");
        }
        range = `^${range}.0.0-0`;
    }
    if (!is.string(range)) {
        throw new Error("Expected string or integer value.");
    }

    if (semver.satisfies(core.version, range)) {
        return;
    }

    const limit = Error.stackTraceLimit;

    if (is.number(limit) && limit < 25) {
        // Bump up the limit if needed so that users are more likely
        // to be able to see what is calling Babel.
        Error.stackTraceLimit = 25;
    }

    const err = new Error(
        `Requires Babel "${range}", but was loaded with "${core.version}". ` +
        "If you are sure you have a compatible version of @babel/core, " +
        "it is likely that something in your build process is loading the " +
        "wrong version. Inspect the stack trace of this error to look for " +
        "the first entry that doesn't mention \"@babel/core\" or \"babel-core\" " +
        "to see what is calling Babel.",
    );

    if (is.number(limit)) {
        Error.stackTraceLimit = limit;
    }

    throw Object.assign(
        err,
        ({
            code: "BABEL_VERSION_UNSUPPORTED",
            version: core.version,
            range
        }: any),
    );
}
