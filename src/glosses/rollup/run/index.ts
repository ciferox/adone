import { WarningHandler } from '../rollup/types';
import mergeOptions, { GenericConfigObject } from '../utils/mergeOptions';
import { getAliasName } from '../utils/relativeId';
import { handleError } from './logging';
import batchWarnings from './batchWarnings';
import build from './build';
import loadConfigFile from './loadConfigFile';
import watch from './watch';

const {
	fs: { realpathSync }
} = adone;

const execute = (configFile: string, configs: GenericConfigObject[], options: any) => {
	if (options.watch) {
		watch(configFile, configs, options, options.silent);
	} else {
		let promise = Promise.resolve();
		for (const config of configs) {
			promise = promise.then(() => {
				const warnings = batchWarnings();
				const { inputOptions, outputOptions, optionError } = mergeOptions({
					command: options,
					config,
					defaultOnWarnHandler: warnings.add
				});

				if (optionError)
					(inputOptions.onwarn as WarningHandler)({ code: 'UNKNOWN_OPTION', message: optionError });
				return build(inputOptions, outputOptions, warnings, options.silent);
			});
		}
		return promise;
	}
};

export default function runRollup(options: any) {
	let inputSource;
	if (typeof options.input === 'string') {
		inputSource = [options.input];
	} else {
		inputSource = options.input;
	}

	if (inputSource && inputSource.length > 0) {
		if (inputSource.some((input: string) => input.indexOf('=') !== -1)) {
			options.input = {};
			inputSource.forEach((input: string) => {
				const equalsIndex = input.indexOf('=');
				const value = input.substr(equalsIndex + 1);
				let key = input.substr(0, equalsIndex);
				if (!key) key = getAliasName(input);
				options.input[key] = value;
			});
		} else {
			options.input = inputSource;
		}
	}

	if (options.environment) {
		const environment = Array.isArray(options.environment)
			? options.environment
			: [options.environment];

		environment.forEach((arg: string) => {
			arg.split(',').forEach((pair: string) => {
				const [key, value] = pair.split(':');
				if (value) {
					process.env[key] = value;
				} else {
					process.env[key] = String(true);
				}
			});
		});
	}

	let configFile = options.config === true || options.config.length === "" ? 'rollup.config.js' : options.config;

	const cwd = options.cwd || process.cwd();
	delete options.cwd;
	if (configFile) {
		if (configFile.slice(0, 5) === 'node:') {
			const pkgName = configFile.slice(5);
			try {
				configFile = adone.module.resolve(`rollup-config-${pkgName}`, { basedir: cwd });
			} catch (err) {
				try {
					configFile = adone.module.resolve(pkgName, { basedir: cwd });
				} catch (err) {
					if (err.code === 'MODULE_NOT_FOUND') {
						handleError({
							code: 'MISSING_EXTERNAL_CONFIG',
							message: `Could not resolve config file ${configFile}`
						});
					}

					throw err;
				}
			}
		} else {
			// find real path of config so it matches what Node provides to callbacks in require.extensions
			configFile = realpathSync(adone.path.join(cwd, configFile));
		}

		if (options.watch) {
			process.env.ROLLUP_WATCH = 'true';
		}

		return loadConfigFile(configFile, options)
			.then(configs => execute(configFile, configs, options))
			.catch(handleError);
	} else {
		return execute(configFile, [{ input: null }] as any, options);
	}
}
