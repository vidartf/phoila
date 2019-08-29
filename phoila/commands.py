import os
import sys

from traitlets import Instance, Unicode, default, HasTraits
from jupyterlab import labextensions, labapp
from jupyterlab.coreconfig import CoreConfig

APP_DIR_DEFAULT = os.path.join(sys.prefix, "share", "jupyter", "phoila")

extensions = (
    "@jupyterlab/application-extension",
    "@jupyterlab/apputils-extension",
    "@jupyterlab/csvviewer-extension",
    "@jupyterlab/docmanager-extension",
    "@jupyterlab/htmlviewer-extension",
    "@jupyterlab/imageviewer-extension",
    "@jupyterlab/markdownviewer-extension",
    "@jupyterlab/mathjax2-extension",
    "@jupyterlab/rendermime-extension",
    "@jupyterlab/shortcuts-extension",
    "@jupyterlab/theme-dark-extension",
    "@jupyterlab/theme-light-extension",
    "@jupyterlab/vdom-extension",
)
mime_extensions = (
    "@jupyterlab/javascript-extension",
    "@jupyterlab/json-extension",
    "@jupyterlab/pdf-extension",
    "@jupyterlab/vega4-extension",
    "@jupyterlab/vega5-extension",
)
singletons = (
    "@jupyterlab/application",
    "@jupyterlab/apputils",
    "@jupyterlab/console",
    "@jupyterlab/coreutils",
    "@jupyterlab/docmanager",
    "@jupyterlab/extensionmanager",
    "@jupyterlab/filebrowser",
    "@jupyterlab/fileeditor",
    "@jupyterlab/imageviewer",
    "@jupyterlab/launcher",
    "@jupyterlab/notebook",
    "@jupyterlab/rendermime",
    "@jupyterlab/rendermime-interfaces",
    "@jupyterlab/services",
    "@jupyterlab/terminal",
    "@jupyterlab/tooltip",
)


class PhoilaMixin(HasTraits):
    app_dir = Unicode(APP_DIR_DEFAULT, config=True, help="The app directory to target")

    core_config = Instance(CoreConfig, allow_none=True)

    @default("core_config")
    def _default_core_config(self):
        c = CoreConfig()
        orig_extensions = c.extensions
        orig_mimes = c.mime_extensions
        orig_singletons = c.singletons
        c.clear_packages()
        for e in extensions:
            c.add(e, orig_extensions[e], extension=True)
        for e in mime_extensions:
            c.add(e, orig_mimes[e], mime_extension=True)
        for e in singletons:
            c.add(e, orig_singletons[e])
        return c


class InstallPhoilaExtensionApp(PhoilaMixin, labextensions.InstallLabExtensionApp):
    pass


class UpdatePhoilaExtensionApp(PhoilaMixin, labextensions.UpdateLabExtensionApp):
    pass


class UninstallPhoilaExtensionApp(PhoilaMixin, labextensions.UninstallLabExtensionApp):
    pass


class ListLPhoilaxtensionsApp(PhoilaMixin, labextensions.ListLabExtensionsApp):
    pass


class LinkPhoilaExtensionApp(PhoilaMixin, labextensions.LinkLabExtensionApp):
    pass


class UnlinkPhoilaExtensionApp(PhoilaMixin, labextensions.UnlinkLabExtensionApp):
    pass


class EnableLPhoilaxtensionsApp(PhoilaMixin, labextensions.EnableLabExtensionsApp):
    pass


class DisableLPhoilaxtensionsApp(PhoilaMixin, labextensions.DisableLabExtensionsApp):
    pass


class CheckLPhoilaxtensionsApp(PhoilaMixin, labextensions.CheckLabExtensionsApp):
    pass


class PhoilaBuildApp(PhoilaMixin, labapp.LabBuildApp):
    def start(self):
        # Ensure we override the `sys_dir` in lab when building:
        os.environ["JUPYTERLAB_DIR"] = self.app_dir
        super(PhoilaBuildApp, self).start()


class PhoilaCleanApp(PhoilaMixin, labapp.LabCleanApp):
    pass
