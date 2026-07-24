/**
 * Purpose: Vite proxy target discovery for Frappe bench / worktree layouts.
 * Exports: default proxy options object.
 *
 * Last updated: 2026-07-24
 * Author: Pramniaga
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Bench layout when the app lives at frappe-bench/apps/<app>:
 *   ../../../sites/common_site_config.json
 *
 * Linked worktrees live outside apps/ (e.g. development/worktrees/pramniaga--*),
 * so that relative path breaks. Walk up and also look for frappe-bench/sites/.
 */
/**
 * findCommonSiteConfig - Walk up from startDir to locate sites/common_site_config.json.
 *
 * @param startDir - Directory to start walking from.
 * @returns Absolute path to common_site_config.json.
 */
function findCommonSiteConfig(startDir: string): string {
	const envRoot = process.env.FRAPPE_BENCH_ROOT;
	if (envRoot) {
		const fromEnv = path.join(envRoot, 'sites', 'common_site_config.json');
		if (fs.existsSync(fromEnv)) {
			return fromEnv;
		}
		throw new Error(
			`FRAPPE_BENCH_ROOT is set (${envRoot}) but sites/common_site_config.json was not found`
		);
	}

	let dir = startDir;
	while (true) {
		const candidates = [
			path.join(dir, 'sites', 'common_site_config.json'),
			path.join(dir, 'frappe-bench', 'sites', 'common_site_config.json'),
		];
		for (const candidate of candidates) {
			if (fs.existsSync(candidate)) {
				return candidate;
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}

	throw new Error(
		`Could not find sites/common_site_config.json walking up from ${startDir}. ` +
			`Run under the bench, or set FRAPPE_BENCH_ROOT to the frappe-bench directory.`
	);
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = findCommonSiteConfig(appRoot);
const common_site_config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
	webserver_port: number;
	default_site?: string;
};

const { webserver_port, default_site } = common_site_config;

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://127.0.0.1:${webserver_port}`,
		ws: true,
		router: function (req: { headers: { host?: string } }) {
			const host = req.headers.host?.split(':')[0] || default_site;
			const site =
				host === 'localhost' || host === '127.0.0.1' ? default_site : host;
			return `http://${site}:${webserver_port}`;
		},
	},
};
