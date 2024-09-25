# -*- coding: utf-8 -*-
# 该代码属于ArcoV8，具体信息应参见 LICENSE 文件。

{
    'name': 'Arco HomeMenu',
    'summary': """
        HomeMenu
        菜单配置
        菜单面板
        菜单
        Home
        Menu
        zerone40
    """,
    'description': """
        HomeMenu
    """,
    'version': '16.0.1.0',
    'author': "zerone40",
    'maintainers': ['zerone40@163.com'],
    'website': '',
    'category': 'Tools',
    'price': 25,
    'currency': 'USD',

    'depends': ['web'],

    'data': [
        'security/ir.model.access.csv',
        'views/arco_home.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'arco_homemenu/static/src/libs/**/*',
            'arco_homemenu/static/src/webclient/**/*',
        ],
    },
    # "images": [
    #     "static/description/banner.gif",
    #     "static/description/main_screenshot.gif",
    # ],
    'application': True,
    'license': 'LGPL-3',
}
