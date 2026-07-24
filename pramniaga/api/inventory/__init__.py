"""
Purpose: Inventory API facade — re-exports all whitelists for stable method paths.
Exports: Every public function under pramniaga.api.inventory.* (see Contents).
Non-goals: Business logic (lives in sibling modules).

Contents:
  - items: items_*, item_groups_list, uoms_list, attributes_*, variants_create
  - warehouses: warehouses_list, warehouses_create
  - stock: stock_on_hand, stock_balance
  - moves: receipts_*, deliveries_*, transfers_*, moves_*
  - adjustments: adjustments_*
  - overview: overview_counts

Method IDs such as pramniaga.api.inventory.items_list remain valid via these re-exports.
Last updated: 2026-07-24
Author: Pramniaga
"""

from pramniaga.api.inventory.adjustments import (
	adjustments_create,
	adjustments_get,
	adjustments_list,
	adjustments_submit,
)
from pramniaga.api.inventory.items import (
	attributes_create,
	attributes_list,
	item_groups_list,
	items_create,
	items_get,
	items_list,
	items_update,
	uoms_list,
	variants_create,
)
from pramniaga.api.inventory.moves import (
	deliveries_create,
	deliveries_list,
	moves_cancel,
	moves_get,
	moves_submit,
	receipts_create,
	receipts_list,
	transfers_create,
	transfers_list,
)
from pramniaga.api.inventory.overview import overview_counts
from pramniaga.api.inventory.stock import stock_balance, stock_on_hand
from pramniaga.api.inventory.warehouses import warehouses_create, warehouses_list

__all__ = [
	"adjustments_create",
	"adjustments_get",
	"adjustments_list",
	"adjustments_submit",
	"attributes_create",
	"attributes_list",
	"deliveries_create",
	"deliveries_list",
	"item_groups_list",
	"items_create",
	"items_get",
	"items_list",
	"items_update",
	"moves_cancel",
	"moves_get",
	"moves_submit",
	"overview_counts",
	"receipts_create",
	"receipts_list",
	"stock_balance",
	"stock_on_hand",
	"transfers_create",
	"transfers_list",
	"uoms_list",
	"variants_create",
	"warehouses_create",
	"warehouses_list",
]
