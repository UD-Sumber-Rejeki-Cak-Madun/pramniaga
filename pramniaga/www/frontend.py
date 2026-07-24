"""
Purpose: WWW context for the SPA shell page (boot + CSRF + session).
Exports: get_context, get_context_for_dev, get_boot.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe
from frappe.utils import get_system_timezone

from pramniaga.api.auth import session as get_session
from pramniaga.api.common import get_default_company

no_cache = 1


def get_context():
	"""
	get_context - Jinja context for www/frontend.html — injects boot with session and CSRF.

	Returns:
		Context dict with boot payload.
	"""
	csrf_token = frappe.sessions.get_csrf_token()
	context = frappe._dict()
	context.boot = get_boot()
	context.boot.csrf_token = csrf_token
	context.boot.session = get_session()
	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	"""
	get_context_for_dev - Dev-only boot payload for Vite/yarn without full page render.

	Returns:
		Boot dict (same as get_boot).
	"""
	if not frappe.conf.developer_mode:
		frappe.throw("This method is only meant for developer mode")
	return get_boot()


def get_boot():
	"""
	get_boot - Shared SPA boot dict (version, site, timezone, company, session).

	Returns:
		frappe._dict boot payload.
	"""
	return frappe._dict(
		{
			"frappe_version": frappe.__version__,
			"site_name": frappe.local.site,
			"read_only_mode": frappe.flags.read_only,
			"system_timezone": get_system_timezone(),
			"default_company": get_default_company(),
			"session": get_session(),
		}
	)
