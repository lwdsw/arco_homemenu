# -*- coding: utf-8 -*-
# 该代码属于ArcoV8，具体信息应参见 LICENSE 文件。

import uuid

from odoo import models, fields, api, _

DEFAULT_OPTION = {
    "x": 0,
    "y": 0,
    "w": 3,
    "h": 2
}


class ArcoUserHome(models.Model):
    _name = 'arco.user.home'
    _description = 'Arco User Home'
    _order = "id asc"

    user_id = fields.Many2one(
        'res.users', string='User', required=True, ondelete='cascade', index=True
    )
    folder_ids = fields.One2many(
        'arco.user.home.folder', 'home_id', string='Folders'
    )
    is_default = fields.Boolean(string='Default')

    @api.model
    def get_user_homes(self, debug):
        home_ids = self.search([('user_id', '=', self.env.user.id)])
        if not home_ids:
            home_ids = self.create({"user_id": self.env.user.id})

        home_data = [
            {
                "id": home_id.id,
                "is_default": home_id.is_default,
                "home_folders": [
                    {
                        "_id": folder_id.id,
                        "id": folder_id.key,
                        "name": folder_id.name,
                        "x": folder_id.x,
                        "y": folder_id.y,
                        "w": folder_id.w,
                        "h": folder_id.h,
                        "minW": 2, "minH": 2,
                        "menuitems": folder_id.get_menus(debug)
                    }
                    for folder_id in home_id.folder_ids
                ]
            }
            for home_id in home_ids
        ]
        default_home_id = home_ids.filtered(lambda x: x.is_default)
        return {"home_data": home_data, "default_home_id": default_home_id.id or 0}

    @api.model
    def add_new_home(self):
        home_count = self.search_count([('user_id', '=', self.env.user.id)])
        if home_count >= 5:
            return -1

        new_home = self.create({
            "user_id": self.env.user.id,
            "folder_ids": [(0, 0, {
                "name": "New Folder", "key": str(uuid.uuid4()),
                "x": DEFAULT_OPTION["x"], "y": DEFAULT_OPTION["y"],
                "w": DEFAULT_OPTION["w"], "h": DEFAULT_OPTION["h"]
            })]
        })
        return new_home.id

    @api.model
    def remove_home(self, home_id):
        home_ids = self.search([
            ('user_id', '=', self.env.user.id)
        ], order="id asc")
        home = home_ids.filtered(lambda x: x.id == home_id)
        if home:
            home.unlink()
        prev_ids = home_ids.filtered(lambda x: x.id != home_id)
        if len(prev_ids) > 0:
            return prev_ids[-1].id
        return 0

    @api.model
    def set_default(self, home_id):
        home_ids = self.search([
            ('user_id', '=', self.env.user.id)
        ], order="id asc")
        home_ids.filtered(lambda x: x.id == home_id).write(
            {"is_default": True})
        home_ids.filtered(lambda x: x.id != home_id).write(
            {"is_default": False})


class ArcoUserHomeFolder(models.Model):
    _name = 'arco.user.home.folder'
    _description = 'Arco User Home Folder'

    home_id = fields.Many2one(
        'arco.user.home', string='Home', required=True, ondelete='cascade', index=True
    )

    name = fields.Char("名称", required=True, default="New Folder")
    key = fields.Char("Key", required=True)
    x = fields.Integer("X", required=True)
    y = fields.Integer("Y", required=True)
    w = fields.Integer("W", required=True)
    h = fields.Integer("H", required=True)

    line_ids = fields.One2many(
        'arco.user.home.folder.menu', 'folder_id', string='Menu LIne'
    )

    @api.model
    def add_new_folder(self, home_id, key, name, x, y, w, h):
        return self.create({
            "home_id": home_id, "key": key, "name": name,
            "x": x, "y": y, "w": w,  "h": h
        })

    @api.model
    def reset_folders_data(self, home_id, datas):
        home_id = self.env["arco.user.home"].search([("id", "=", home_id)])
        for data in datas:
            folder_key = data.pop("key")
            home_id.folder_ids.filtered(
                lambda x: x.key == folder_key).write(data)

    @api.model
    def rename_folder(self, home_id, key, name):
        home_id = self.env["arco.user.home"].search([("id", "=", home_id)])
        home_id.folder_ids.filtered(
            lambda x: x.key == key).write({"name": name})

    @api.model
    def remove_folder(self, home_id, key):
        home_id = self.env["arco.user.home"].search([("id", "=", home_id)])
        home_id.folder_ids.filtered(lambda x: x.key == key).unlink()

    @api.model
    def get_menus(self, debug):
        menus = self.env["ir.ui.menu"].load_menus(debug)

        folder_id = self.env["arco.user.home.folder"].search(
            [("id", "=", self.id)
        ])

        menuitems = self.env['ir.model.data'].sudo().search([
            ('res_id', 'in', folder_id.line_ids.menu_id.ids), ('model', '=', 'ir.ui.menu')
        ])
        xmlids = {
            menu.res_id: menu.complete_name
            for menu in menuitems
        }

        data = []
        for line_id in folder_id.line_ids:
            if line_id.menu_id.id not in menus:
                continue

            action = line_id.menu_id.action
            action_model = action._name if action else False
            action_id = action.id if action else False
            data.append({
                "id": line_id.menu_id.id,
                "name": line_id.menu_id.name,
                "xmlid": xmlids.get(line_id.menu_id.id, ""),
                "actionID": action_id,
                "actionModel": action_model,
                "webIconData": line_id.new_icon_data or line_id.menu_icon_data
            })
        return data


class ArcoUserHomeFolderMenu(models.Model):
    _name = 'arco.user.home.folder.menu'
    _description = 'Arco User Home Folder Menu'
    _order = "sequence asc"

    folder_id = fields.Many2one(
        'arco.user.home.folder', string='Folder', required=True, ondelete='cascade', index=True
    )
    sequence = fields.Integer("Sequence", required=True)
    menu_id = fields.Many2one(
        'ir.ui.menu', string='Menu', required=True, ondelete='cascade', index=True,
        domain="[('action', '!=', False)]"
    )
    menu_icon_data = fields.Binary(related="menu_id.web_icon_data")
    new_icon_data = fields.Binary(string='My Icon', attachment=True)


class IrUiMenu(models.Model):
    _inherit = "ir.ui.menu"

    @api.model
    def load_all_menus(self, debug):
        menus = self.load_menus(debug)

        data = []

        for menu in menus.values():

            if not menu.get("action", False):
                continue
                
            action_model, action_id = menu["action"].split(',')

            data.append({
                "id": menu['id'],
                "name": menu['name'],
                "displayName": f"{menu['parent_id'][1]}/{menu['name']}" if menu.get('parent_id', False) else menu['name'],
                "actionID": action_id,
                "actionModel": action_model,
                "webIcon": menu['web_icon'],
                "webIconData": menu['web_icon_data'],
            })

        return data
