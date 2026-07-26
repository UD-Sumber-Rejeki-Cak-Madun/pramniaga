import frappe
from frappe import _

from pramniaga.api.common import get_capabilities, get_companies, get_default_company


@frappe.whitelist(allow_guest=True)
def login(usr: str, pwd: str):
	login_manager = frappe.local.login_manager
	login_manager.authenticate(user=usr, pwd=pwd)
	login_manager.post_login()
	return session()


@frappe.whitelist()
def logout():
	frappe.local.login_manager.logout()
	return {"message": "ok"}


@frappe.whitelist(allow_guest=True)
def session():
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
	"""Return Google OAuth authorize URL when Social Login Key is configured."""
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
