"""
Purpose: Session, login/logout, and Google OAuth URL for the SPA.
Exports: login, logout, session, get_google_login_url.
Non-goals: Capability mapping (common.py); Desk OAuth callback handling.

Last updated: 2026-07-24
Author: Pramniaga
"""

import frappe

from pramniaga.api.common import get_capabilities, get_companies, get_default_company


@frappe.whitelist(allow_guest=True)
def login(usr: str, pwd: str):
	"""
	login - Authenticate with Frappe login manager and return session payload.

	Args:
		usr: Username or email.
		pwd: Password.

	Returns:
		Same shape as session() after successful login.
	"""
	login_manager = frappe.local.login_manager
	login_manager.authenticate(user=usr, pwd=pwd)
	login_manager.post_login()
	return session()


@frappe.whitelist()
def logout():
	"""
	logout - End the current session.

	Returns:
		Dict with message ok.
	"""
	frappe.local.login_manager.logout()
	return {"message": "ok"}


@frappe.whitelist(allow_guest=True)
def session():
	"""
	session - Return SPA session bootstrap (user, roles, capabilities, companies, CSRF).

	Returns:
		Dict with logged_in, user, roles, capabilities, companies, default_company, csrf_token.
		Guest sessions still include csrf_token for subsequent login posts.
	"""
	user = frappe.session.user
	if user == "Guest":
		return {
			"logged_in": False,
			"user": None,
			"roles": [],
			"capabilities": get_capabilities(),
			"companies": [],
			"default_company": None,
			"csrf_token": frappe.sessions.get_csrf_token(),
		}

	return {
		"logged_in": True,
		"user": {
			"name": user,
			"full_name": frappe.utils.get_fullname(user),
			"email": frappe.db.get_value("User", user, "email"),
		},
		"roles": frappe.get_roles(user),
		"capabilities": get_capabilities(),
		"companies": get_companies(),
		"default_company": get_default_company(),
		"csrf_token": frappe.sessions.get_csrf_token(),
	}


@frappe.whitelist(allow_guest=True)
def get_google_login_url(redirect_to: str | None = None):
	"""
	get_google_login_url - Return Google OAuth authorize URL when Social Login Key is configured.

	Args:
		redirect_to: Post-login path (default /frontend).

	Returns:
		Authorize URL string, or None if Google social login is unavailable.
	"""
	from frappe.utils.oauth import get_oauth2_authorize_url, get_oauth_keys
	from frappe.utils.password import get_decrypted_password

	provider = frappe.db.get_value(
		"Social Login Key",
		{"name": "google", "enable_social_login": 1},
		["name", "client_id", "base_url"],
		as_dict=True,
	)
	if not provider:
		provider = frappe.db.get_value(
			"Social Login Key",
			{"provider_name": "Google", "enable_social_login": 1},
			["name", "client_id", "base_url"],
			as_dict=True,
		)
	if not provider or not provider.client_id or not provider.base_url:
		return None

	client_secret = get_decrypted_password(
		"Social Login Key", provider.name, "client_secret", raise_exception=False
	)
	if not client_secret:
		return None

	try:
		get_oauth_keys(provider.name)
	except Exception:
		return None

	return get_oauth2_authorize_url(provider.name, redirect_to or "/frontend")
