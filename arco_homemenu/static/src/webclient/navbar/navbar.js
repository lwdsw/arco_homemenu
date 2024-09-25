/** @odoo-module **/

import { NavBar } from "@web/webclient/navbar/navbar";
import { patch } from '@web/core/utils/patch';

import { useService } from "@web/core/utils/hooks";
import { onWillStart, useState, useRef, onMounted } from "@odoo/owl";
import { ArcoGridStack } from "@arco_homemenu/webclient/gridster/gridstack";
import config from 'web.config';

import { Markup } from 'web.utils';


NavBar.components = { ...NavBar.components, ArcoGridStack };

patch(NavBar.prototype, "UserHomeNavBar", {
    setup() {
        this._super();

        this.orm = useService("orm");
        this.notification = useService("notification");


        this.grids = null;

        this.gridsterLayoutRef = useRef("gridsterLayoutRef");
        this.mainMenusLayoutRef = useRef("mainMenusLayoutRef");

        this.homeMenuState = useState({
            mode: 'readonly',
            homeData: [],
            defaultHomeId: 0,
            currentHomeId: 0,

            searchResults: []
        });

        // onWillStart(this.getUserHome);

        onWillStart(async () => {
            await this.getUserHome();
            await this.loadAllmenus();

        });

        onMounted(() => {
            this.env.bus.on('ARCO:RESET-FOLDERS', this, this.resetHomeFolders);
            this.env.bus.on('ARCO:RENAME-FOLDERS', this, this.renameFolder);
            this.env.bus.on('ARCO:REMOVE-FOLDERS', this, this.removeFolder);
            this.env.bus.on('ARCO:REFRESH', this, this.refreshData);
            this.env.bus.on('ARCO:CLOSE_MENU_DROPDOWN', this, this.closeMenuDropdown);

            $(document).on("click", function (e) {
                if (!$(e.target).closest("#searchContainer,.arco-manager-search").length) {
                    $("#searchContainer").hide();
                    $("#searchContainer").css("opacity", 0);
                    $("#searchContainer").css("transform", "translateX(-50%) scale(0)");
                }
            });
        });
    },

    async loadAllmenus() {
        const data = await this.orm.call(
            "ir.ui.menu", "load_all_menus", [config.isDebug()]
        );
        console.log("data", data);
        this.menus = data;
    },

    async getUserHome() {
        const { home_data, default_home_id } = await this.orm.call(
            "arco.user.home", "get_user_homes", [config.isDebug()]
        );

        this.homeMenuState.homeData = home_data;
        this.homeMenuState.defaultHomeId = default_home_id;
        this.homeMenuState.currentHomeId = default_home_id;
    },

    async setDefault() {
        await this.orm.call(
            "arco.user.home",
            "set_default",
            [this.homeMenuState.currentHomeId]
        );
        await this.getUserHome();
    },

    async addNewHome() {
        let id = await this.orm.call("arco.user.home", "add_new_home", []);
        if (id == -1) {
            this.notification.add(
                "已达页数上限，无法新增。", { title: "新增页错误提示", type: "danger" }
            );
            return;
        }
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async removeHome() {
        let id = await this.orm.call(
            "arco.user.home",
            "remove_home",
            [this.homeMenuState.currentHomeId]
        );
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async addNewFolder() {
        let id = this.homeMenuState.currentHomeId;
        await this.orm.call(
            "arco.user.home.folder",
            "add_new_folder",
            [
                this.homeMenuState.currentHomeId,
                this.__generateUniqueId(),
                "New Folder",
                0, 0, 3, 2
            ]
        );
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async resetHomeFolders(payload) {
        let id = this.homeMenuState.currentHomeId;
        await this.orm.call(
            "arco.user.home.folder",
            "reset_folders_data",
            [
                this.homeMenuState.currentHomeId,
                payload.datas
            ]
        );
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async renameFolder(payload) {
        let id = this.homeMenuState.currentHomeId;
        await this.orm.call(
            "arco.user.home.folder",
            "rename_folder",
            [
                this.homeMenuState.currentHomeId,
                payload.key,
                payload.value
            ]
        );
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async removeFolder(payload) {
        let id = this.homeMenuState.currentHomeId;
        await this.orm.call(
            "arco.user.home.folder",
            "remove_folder",
            [
                this.homeMenuState.currentHomeId,
                payload.key
            ]
        );
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    async refreshData(payload) {
        let id = this.homeMenuState.currentHomeId;
        await this.getUserHome();
        this.homeMenuState.currentHomeId = id;
    },

    getMenuItemHref(payload) {
        const parts = [`menu_id=${payload.id}`];
        if (payload.actionID) {
            parts.push(`action=${payload.actionID}`);
        }
        return "#" + parts.join("&");
    },

    onMenuClick(ev) {
        this.env.bus.trigger('ARCO:CLOSE_MENU_DROPDOWN')
    },

    openSearch() {
        $("#searchContainer").show();
        $("#searchContainer").css("opacity", 1);
        $("#searchContainer").css("transform", "translateX(-50%) scale(1)");
        $("#searchInput").focus();
    },

    onSearchInput(ev) {
        let keyword = ev.target.value;

        if (keyword.length === 0) {
            this.homeMenuState.searchResults = [];
            return;
        }

        let copyMenus = this.menus;

        let searchResults = copyMenus.filter(item => (item.name.includes(keyword) || item.displayName.includes(keyword)));

        let newSearchResults = searchResults.map(item => {
            let newItem = { ...item };
            let displayName = newItem.displayName;
            newItem.displayName = Markup(displayName.replace(keyword, `<span class="search_keyword">${keyword}</span>`));
            return newItem;
        });

        this.homeMenuState.searchResults = newSearchResults;
    },


    closeMenuDropdown(payload) {
        let dpd = $(this.root.el.querySelector(".arco-o_navbar_apps_menu .dropdown-toggle"));
        dpd && $(dpd).click();
    },

    toggleCustomMenuLayout(homeId) {
        this.homeMenuState.currentHomeId = homeId;
    },

    changeHomeMode() {
        this.homeMenuState.mode = this.homeMenuState.mode == "readonly" ? "edit" : "readonly";
    },

    __generateUniqueId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

});
