import pkg from '../../package.json';

export const APP_VERSION: string = pkg.version;
export const FORMATTED_VERSION: string = pkg.version.startsWith('v')
	? pkg.version
	: `v${pkg.version}`;
