# Copyright (c) Vidar Tonaas Fauske.
# Distributed under the terms of the Modified BSD License.

from tornado import web

from jupyter_server.base.handlers import APIHandler, JupyterHandler

from jupyterlab_server.handlers import (
    LabHandler as BaseLabHandler,
    ThemesHandler as BaseThemesHandler,
)
from jupyterlab_server.server import FileFindHandler as BaseFileFindHandler
from jupyterlab_server.workspaces_handler import (
    WorkspacesHandler as BaseWorkspacesHandler,
)
from jupyterlab_server.settings_handler import SettingsHandler as BaseSettingsHandler


class LabHandler(BaseLabHandler, JupyterHandler):
    pass


class ThemesHandler(BaseThemesHandler, JupyterHandler):
    pass


class FileFindHandler(BaseFileFindHandler, JupyterHandler):
    pass


class WorkspacesHandler(BaseWorkspacesHandler, APIHandler):
    @web.authenticated
    def put(self, space_name=""):
        if space_name == "phoila-single-workspace":
            self.set_status(204)
        else:
            super(WorkspacesHandler, self).put(space_name=space_name)


class SettingsHandler(BaseSettingsHandler, APIHandler):
    pass
