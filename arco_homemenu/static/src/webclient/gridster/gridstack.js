/** @odoo-module **/

import { useService } from "@web/core/utils/hooks";
import {
    Component, useState, useRef, onPatched,
    onMounted, onWillUnmount, onWillUpdateProps
} from "@odoo/owl";


export class ArcoGridStack extends Component {
    setup() {

        this.orm = useService("orm");
        this.action = useService("action");
        this.dialog = useService("dialog");

        this.arcoGridStackRef = useRef("arcoGridStackRef");

        this.grids = null;

        this.state = useState({
            mode: this.props.mode,
            homeData: this.props.homeData,

            count: 0,
            homeFolders: [],
        });


        onMounted(this.initGridStack);

        onWillUnmount(() => {
            this.destoryGridStack();
        });

        onWillUpdateProps((nextProps) => {
            this.state.homeData = nextProps.homeData;
            this.state.mode = nextProps.mode;
            this.destoryGridStack();
        });

        onPatched(() => {
            this.initGridStack();
        });

    }


    initGridStack() {
        this.grids = GridStack.initAll({
            // float: true,
            handle: '.arco-panel-title',
            column: 12,
            minRow: 1,
            cellHeight: 70,
            minW: 3,
            minH: 2,
            acceptWidgets: function (el) { return true }
        });

        this.grids && this.grids.forEach((grid, i) => {
            grid.setStatic(this.state.mode === "readonly");
            grid.on('change', (event, items) => {
                let data = []
                items && items.forEach(item => {
                    data.push({
                        "key": item.id, "x": item.x, "y": item.y, "w": item.w, "h": item.h
                    })
                });
                this.env.bus.trigger('ARCO:RESET-FOLDERS', { datas: data })
            });
        });

    }

    destoryGridStack() {
        if (this.grids) {
            this.grids.forEach(function (grid) {
                grid.off('dropped');
                grid.destroy(false);
            });
            this.grids = null;
        }
    }

    getHomeFolders(homeId) {
        return this.props.homeData.find(home => home.id == homeId).home_folders;
    }

    onClickRename(folder_id, selector) {
        let value = this.arcoGridStackRef.el.querySelector(`#${selector}`).value;
        this.env.bus.trigger('ARCO:RENAME-FOLDERS', { key: folder_id, value: value });
    }

    onClickRemove(folder_id) {
        this.env.bus.trigger('ARCO:REMOVE-FOLDERS', { key: folder_id })
    }

    onClickManageMenu(homeId, folderId) {
        let folders = this.getHomeFolders(homeId);
        let menus = folders.find(folder => folder._id == folderId).menuitems;
        const ids = menus.map(menu => menu.id);

        this.action.doAction({
            type: "ir.actions.act_window",
            name: "Manage Menu",
            res_model: 'arco.user.home.folder',
            res_id: folderId,
            views: [[false, "form"]],
            view_mode: "form",
            target: "new",
            context: {
                form_view_ref: 'arco_homemenu.arco_user_home_folder_form_view',
            },
        }, {
            onClose: () => this.env.bus.trigger('ARCO:REFRESH')
        });
    }

    getMenuItemHref(payload) {
        const parts = [`menu_id=${payload.id}`];
        if (payload.actionID) {
            parts.push(`action=${payload.actionID}`);
        }
        return "#" + parts.join("&");
    }

    onMenuClick(ev) {
        this.env.bus.trigger('ARCO:CLOSE_MENU_DROPDOWN')
    }

}

ArcoGridStack.props = {
    homeData: { type: Array, default: [] },
    homeId: { type: Number },
    mode: { type: String, default: "readonly" },
};

ArcoGridStack.template = "arco_homemenu.ArcoGridStack";