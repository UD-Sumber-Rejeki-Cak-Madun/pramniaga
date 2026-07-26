import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, '../pramniaga/www/frontend.html')

let html = readFileSync(target, 'utf8')
html = html.replace(
	"window.csrf_token = '';",
	"window.csrf_token = '{{ frappe.session.csrf_token }}';",
)
html = html.replace('window.boot = {};', 'window.boot = {{ boot | tojson }};')
writeFileSync(target, html)
