// @flow

import { makeStrongCache, type CacheConfigurator } from "../caching";

const {
  std: { path, fs }
} = adone;

export type ConfigFile = {
  filepath: string,
  dirname: string,
  options: {},
};

export type IgnoreFile = {
  filepath: string,
  dirname: string,
  ignore: Array<string>,
};

const BABELRC_FILENAME = ".babelrc";
const BABELRC_JS_FILENAME = ".babelrc.js";
const PACKAGE_FILENAME = "package.json";
const BABELIGNORE_FILENAME = ".babelignore";

export function findBabelrc(
  filepath: string,
  envName: string,
): ConfigFile | null {
  const dirname = path.dirname(filepath);
  let loc = dirname;
  while (true) {
    const conf = [
      BABELRC_FILENAME,
      BABELRC_JS_FILENAME,
      PACKAGE_FILENAME,
    ].reduce((previousConfig: ConfigFile | null, name) => {
      const filepath = path.join(loc, name);
      const config = readConfig(filepath, envName);

      if (config && previousConfig) {
        throw new Error(
          `Multiple configuration files found. Please remove one:\n` +
          ` - ${path.basename(previousConfig.filepath)}\n` +
          ` - ${name}\n` +
          `from ${loc}`,
        );
      }

      return config || previousConfig;
    }, null);

    if (conf) {
      return conf;
    }

    const nextLoc = path.dirname(loc);
    if (loc === nextLoc) break;
    loc = nextLoc;
  }

  return null;
}

export function findBabelignore(filepath: string): IgnoreFile | null {
  const dirname = path.dirname(filepath);
  let loc = dirname;
  while (true) {
    const ignoreLoc = path.join(loc, BABELIGNORE_FILENAME);
    const ignore = readIgnoreConfig(ignoreLoc);

    if (ignore) {
      return ignore;
    }

    const nextLoc = path.dirname(loc);
    if (loc === nextLoc) break;
    loc = nextLoc;
  }

  return null;
}

export function loadConfig(
  name: string,
  dirname: string,
  envName: string,
): ConfigFile {
  const filepath = adone.js.Module.resolve(name, { basedir: dirname });

  const conf = readConfig(filepath, envName);
  if (!conf) {
    throw new Error(`Config file ${filepath} contains no configuration data`);
  }

  return conf;
}

/**
 * Read the given config file, returning the result. Returns null if no config was found, but will
 * throw if there are parsing errors while loading a config.
 */
function readConfig(filepath, envName) {
  return path.extname(filepath) === ".js"
    ? readConfigJS(filepath, { envName })
    : readConfigFile(filepath);
}

const LOADING_CONFIGS = new Set();

const readConfigJS = makeStrongCache(
  (filepath, cache: CacheConfigurator<{ envName: string }>) => {
    if (!fs.existsSync(filepath)) {
      cache.forever();
      return null;
    }

    // The `require()` call below can make this code reentrant if a require hook like @babel/register has been
    // loaded into the system. That would cause Babel to attempt to compile the `.babelrc.js` file as it loads
    // below. To cover this case, we auto-ignore re-entrant config processing.
    if (LOADING_CONFIGS.has(filepath)) {
      cache.never();

      return {
        filepath,
        dirname: path.dirname(filepath),
        options: {},
      };
    }

    let options;
    try {
      LOADING_CONFIGS.add(filepath);

      // $FlowIssue
      const configModule = (require(filepath): mixed);
options =
  configModule && configModule.__esModule
    ? configModule.default || undefined
    : configModule;
    } catch (err) {
  err.message = `${filepath}: Error while loading config - ${err.message}`;
  throw err;
} finally {
  LOADING_CONFIGS.delete(filepath);
}

if (typeof options === "function") {
  options = options({
    cache: cache.simple(),
    // Expose ".env()" so people can easily get the same env that we expose using the "env" key.
    env: () => cache.using(data => data.envName),
    async: () => false,
  });

  if (!cache.configured()) throwConfigError();
}

if (!options || typeof options !== "object" || Array.isArray(options)) {
  throw new Error(
    `${filepath}: Configuration should be an exported JavaScript object.`,
  );
}

if (typeof options.then === "function") {
  throw new Error(
    `You appear to be using an async configuration, ` +
    `which your current version of Babel does not support. ` +
    `We may add support for this in the future, ` +
    `but if you're on the most recent version of @babel/core and still ` +
    `seeing this error, then you'll need to synchronously return your config.`,
  );
}

return {
  filepath,
  dirname: path.dirname(filepath),
  options,
};
  },
);

const readConfigFile = makeStaticFileCache((filepath, content) => {
  let options;
  if (path.basename(filepath) === PACKAGE_FILENAME) {
    try {
      options = JSON.parse(content).babel;
    } catch (err) {
      err.message = `${filepath}: Error while parsing JSON - ${err.message}`;
      throw err;
    }
    if (!options) return null;
  } else {
    try {
      options = adone.data.json5.decode(content);
    } catch (err) {
      err.message = `${filepath}: Error while parsing config - ${err.message}`;
      throw err;
    }

    if (!options) throw new Error(`${filepath}: No config detected`);
  }

  if (typeof options !== "object") {
    throw new Error(`${filepath}: Config returned typeof ${typeof options}`);
  }
  if (Array.isArray(options)) {
    throw new Error(`${filepath}: Expected config object but found array`);
  }

  return {
    filepath,
    dirname: path.dirname(filepath),
    options,
  };
});

const readIgnoreConfig = makeStaticFileCache((filepath, content) => {
  const ignore = content
    .split("\n")
    .map(line => line.replace(/#(.*?)$/, "").trim())
    .filter(line => !!line);

  return {
    filepath,
    dirname: path.dirname(filepath),
    ignore,
  };
});

function makeStaticFileCache<T>(fn: (string, string) => T): string => T | null {
  return makeStrongCache((filepath, cache) => {
    if (cache.invalidate(() => fileMtime(filepath)) === null) {
      cache.forever();
      return null;
    }

    return fn(filepath, fs.readFileSync(filepath, "utf8"));
  });
}

function fileMtime(filepath: string): number | null {
  try {
    return +fs.statSync(filepath).mtime;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  return null;
}

function throwConfigError() {
  throw new Error(`\
Caching was left unconfigured. Babel's plugins, presets, and .babelrc.js files can be configured
for various types of caching, using the first param of their handler functions:

module.exports = function(api) {
  // The API exposes the following:

  // Cache the returned value forever and don't call this function again.
  api.cache(true);

  // Don't cache at all. Not recommended because it will be very slow.
  api.cache(false);

  // Cached based on the value of some function. If this function returns a value different from
  // a previously-encountered value, the plugins will re-evaluate.
  var env = api.cache(() => process.env.NODE_ENV);

  // If testing for a specific env, we recommend specifics to avoid instantiating a plugin for
  // any possible NODE_ENV value that might come up during plugin execution.
  var isProd = api.cache(() => process.env.NODE_ENV === "production");

  // .cache(fn) will perform a linear search though instances to find the matching plugin based
  // based on previous instantiated plugins. If you want to recreate the plugin and discard the
  // previous instance whenever something changes, you may use:
  var isProd = api.cache.invalidate(() => process.env.NODE_ENV === "production");

  // Note, we also expose the following more-verbose versions of the above examples:
  api.cache.forever(); // api.cache(true)
  api.cache.never();   // api.cache(false)
  api.cache.using(fn); // api.cache(fn)

  // Return the value that will be cached.
  return { };
};`);
}
