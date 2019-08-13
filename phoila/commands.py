
import os
import sys

from traitlets import Unicode, default
from jupyterlab import labextensions, labapp

APP_DIR_DEFAULT = os.path.join(sys.prefix, 'share', 'jupyter', 'phoila')


class InstallPhoilaExtensionApp(labextensions.InstallLabExtensionApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class UpdatePhoilaExtensionApp(labextensions.UpdateLabExtensionApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class UninstallPhoilaExtensionApp(labextensions.UninstallLabExtensionApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class ListLPhoilaxtensionsApp(labextensions.ListLabExtensionsApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")
class LinkPhoilaExtensionApp(labextensions.LinkLabExtensionApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class UnlinkPhoilaExtensionApp(labextensions.UnlinkLabExtensionApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class EnableLPhoilaxtensionsApp(labextensions.EnableLabExtensionsApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class DisableLPhoilaxtensionsApp(labextensions.DisableLabExtensionsApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class CheckLPhoilaxtensionsApp(labextensions.CheckLabExtensionsApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

class PhoilaBuildApp(labapp.LabBuildApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

    def start(self):
        # Ensure we override the `sys_dir` in lab when building:
        os.environ['JUPYTERLAB_DIR'] = self.app_dir
        super(PhoilaBuildApp, self).start()

class PhoilaCleanApp(labapp.LabCleanApp):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True,
        help="The app directory to target")

