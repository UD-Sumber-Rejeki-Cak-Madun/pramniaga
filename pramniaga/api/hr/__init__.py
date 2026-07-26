"""
Purpose: HR API facade — re-exports all whitelists for stable method paths.
Exports: Every public function under pramniaga.api.hr.* (see Contents).
Non-goals: Business logic (lives in sibling modules).

Contents:
  - employees: employee_me, employees_list
  - overview: overview_counts

Method IDs such as pramniaga.api.hr.employee_me remain valid via these re-exports.
Last updated: 2026-07-25
Author: Pramniaga
"""

from pramniaga.api.hr.employees import employee_me, employees_list
from pramniaga.api.hr.overview import overview_counts

__all__ = [
	"employee_me",
	"employees_list",
	"overview_counts",
]
