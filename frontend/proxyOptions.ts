import common_site_config from '../../../sites/common_site_config.json';

const { webserver_port, default_site } = common_site_config;

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://127.0.0.1:${webserver_port}`,
		ws: true,
		router: function(req) {
			const host = req.headers.host?.split(':')[0] || default_site;
			const site =
				host === 'localhost' || host === '127.0.0.1' ? default_site : host;
			return `http://${site}:${webserver_port}`;
		}
	}
};
