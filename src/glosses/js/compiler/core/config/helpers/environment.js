// @flow

export const getEnv = (defaultValue: string = "development"): string => process.env.BABEL_ENV || process.env.NODE_ENV || defaultValue;
