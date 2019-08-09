# Copyright (c) Vidar Tonaas Fauske.
# Distributed under the terms of the Modified BSD License.

import os
import sys

import tornado.web
from traitlets import HasTraits, Bool, Unicode, default
from jupyter_core.paths import jupyter_config_path
from jupyterlab.commands import (
    get_app_dir,
    get_app_info,
    get_user_settings_dir,
)
from jupyterlab_server.handlers import LabHandler, is_url, ThemesHandler
from jupyterlab_server.server import  url_path_join as ujoin, FileFindHandler
from jupyterlab_server.settings_handler import SettingsHandler
from voila.paths import notebook_path_regex

from ._version import __version__

HERE = os.path.dirname(__file__)

class PhoilaConfig(HasTraits):
    """The application configuration object.
    """
    app_name = Unicode('', help='The name of the application.')

    app_version = Unicode('', help='The version of the application.')

    app_namespace = Unicode('', help='The namespace of the application.')

    app_url = Unicode('phoila', help='The url path for the application.')

    app_settings_dir = Unicode('', help='The application settings directory.')

    templates_dir = Unicode('', help='The application templates directory.')

    static_dir = Unicode('',
                         help=('The optional location of local static files. '
                               'If given, a static file handler will be '
                               'added.'))

    static_url = Unicode(help=('The url path for static application '
                               'assets. This can be a CDN if desired.'))

    settings_url = Unicode(help='The url path of the settings handler.')

    user_settings_dir = Unicode('',
                                help=('The optional location of the user '
                                      'settings directory.'))

    schemas_dir = Unicode('',
                          help=('The optional location of the settings '
                                'schemas directory. If given, a handler will '
                                'be added for settings.'))

    themes_url = Unicode(help='The theme url.')

    themes_dir = Unicode('',
                         help=('The optional location of the themes '
                               'directory. If given, a handler will be added '
                               'for themes.'))

    tree_url = Unicode(help='The url path of the tree handler.')

    cache_files = Bool(True,
                       help=('Whether to cache files on the server. '
                             'This should be `True` except in dev mode.'))

    @default('static_url')
    def _default_static_url(self):
        return ujoin('static', self.app_url)

    @default('settings_url')
    def _default_settings_url(self):
        return ujoin(self.app_url, 'api', 'settings/')

    @default('themes_url')
    def _default_themes_url(self):
        return ujoin(self.app_url, 'api', 'themes/')

    @default('tree_url')
    def _default_tree_url(self):
        return '/voila/tree/'


def load_config(nbapp):
    config = PhoilaConfig()
    app_dir = getattr(nbapp, 'app_dir', get_app_dir())
    info = get_app_info(app_dir)
    static_url = info['staticUrl']
    user_settings_dir = getattr(
        nbapp, 'user_settings_dir', get_user_settings_dir()
    )

    config.app_dir = app_dir
    config.app_name = 'Phoila'
    config.app_namespace = 'phoila'
    config.cache_files = True
    config.schemas_dir = os.path.join(app_dir, 'schemas')
    config.templates_dir = os.path.join(app_dir, 'static')
    config.themes_dir = os.path.join(app_dir, 'themes')
    config.user_settings_dir = user_settings_dir

    if getattr(nbapp, 'override_static_url', ''):
        static_url = nbapp.override_static_url
    if getattr(nbapp, 'override_theme_url', ''):
        config.themes_url = nbapp.override_theme_url
        config.themes_dir = ''

    if static_url:
        config.static_url = static_url
    else:
        config.static_dir = os.path.join(app_dir, 'static')

    return config

def _load_jupyter_server_extension(nb_server_app):
    if 'JUPYTERLAB_DIR' not in os.environ:
        os.environ['JUPYTERLAB_DIR'] = os.path.join(
            sys.prefix, 'share', 'jupyter', 'phoila')
    if 'JUPYTERLAB_SETTINGS_DIR' not in os.environ:
        os.environ['JUPYTERLAB_SETTINGS_DIR'] = os.path.join(
            jupyter_config_path()[0], 'phoila', 'user-settings'
        )
    config = load_config(nb_server_app)
    return add_handlers(nb_server_app.web_app, config)


def add_handlers(web_app, config):
    """Add the appropriate handlers to the web app.
    """
    # Normalize directories.
    for name in config.trait_names():
        if not name.endswith('_dir'):
            continue
        value = getattr(config, name)
        setattr(config, name, value.replace(os.sep, '/'))

    # Normalize urls
    # Local urls should have a leading slash but no trailing slash
    for name in config.trait_names():
        if not name.endswith('_url'):
            continue
        value = getattr(config, name)
        if is_url(value):
            continue
        if not value.startswith('/'):
            value = '/' + value
        if value.endswith('/'):
            value = value[:-1]
        setattr(config, name, value)

    # Set up the main page handler and tree handler.
    base_url = web_app.settings.get('base_url', '/')
    app_path = ujoin(base_url, config.app_url)
    handlers = [
        (app_path, LabHandler, {'lab_config': config}),
        #  + notebook_path_regex + '?'
    ]

    # Cache all or none of the files depending on the `cache_files` setting.
    no_cache_paths = [] if config.cache_files else ['/']

    # Handle local static assets.
    if config.static_dir:
        static_path = ujoin(base_url, config.static_url, '(.*)')
        handlers.append((static_path, FileFindHandler, {
            'path': config.static_dir,
            'no_cache_paths': no_cache_paths
        }))

    # Handle local settings.
    if config.schemas_dir:
        settings_config = {
            'app_settings_dir': config.app_settings_dir,
            'schemas_dir': config.schemas_dir,
            'settings_dir': config.user_settings_dir
        }

        # Handle requests for the list of settings. Make slash optional.
        settings_path = ujoin(base_url, config.settings_url, '?')
        handlers.append((settings_path, SettingsHandler, settings_config))

        # Handle requests for an individual set of settings.
        setting_path = ujoin(
            base_url, config.settings_url, '(?P<schema_name>.+)')
        handlers.append((setting_path, SettingsHandler, settings_config))

    # Handle local themes.
    if config.themes_dir:
        themes_url = ujoin(base_url, config.themes_url)
        themes_path = ujoin(themes_url, '(.*)')
        handlers.append((
            themes_path,
            ThemesHandler,
            {
                'themes_url': themes_url,
                'path': config.themes_dir,
                'no_cache_paths': no_cache_paths
            }
        ))

    web_app.add_handlers('.*$', handlers)
