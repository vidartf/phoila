import json
import os
import sys

from jupyter_core.application import JupyterApp
from jupyterlab import labextensions, labapp
from notebook.notebookapp import NotebookApp

from ._version import __version__
from .server_extension import _load_jupyter_server_extension
from .voila_handlers import add_voila_handlers

HERE = os.path.abspath(os.path.dirname(__file__))


_examples = """
phoila build                       # build bundle
phoila list                        # list all configured labextensions
phoila <extension name>    # install a labextension
phoila <extension name>  # uninstall a labextension
"""

class PhoilaApp(NotebookApp):
    """Base jupyter labextension command entry point"""
    name = "phoila"
    version = __version__
    description = "Work with Phoila JupyterLab extensions"
    examples = _examples

    subcommands = dict(
        install=(labextensions.InstallLabExtensionApp, "Install labextension(s)"),
        update=(labextensions.UpdateLabExtensionApp, "Update labextension(s)"),
        uninstall=(labextensions.UninstallLabExtensionApp, "Uninstall labextension(s)"),
        list=(labextensions.ListLabExtensionsApp, "List labextensions"),
        link=(labextensions.LinkLabExtensionApp, "Link labextension(s)"),
        unlink=(labextensions.UnlinkLabExtensionApp, "Unlink labextension(s)"),
        enable=(labextensions.EnableLabExtensionsApp, "Enable labextension(s)"),
        disable=(labextensions.DisableLabExtensionsApp, "Disable labextension(s)"),
        check=(labextensions.CheckLabExtensionsApp, "Check labextension(s)"),
        build=(labapp.LabBuildApp, labapp.LabBuildApp.description.splitlines()[0]),
        clean=(labapp.LabCleanApp, labapp.LabCleanApp.description.splitlines()[0]),
    )

    def init_server_extensions(self):
        """Load any extensions specified by config.

        Import the module, then call the load_jupyter_server_extension function,
        if one exists.

        If the phoila server extension is not enabled, it will
        be manually loaded with a warning.

        The extension API is experimental, and may change in future releases.
        """
        # Don't load the voila server extension if it is enabled
        # we will add our own voila handlers
        if self.nbserver_extensions.get('voila', False):
            self.nbserver_extensions['voila'] = False
        super(PhoilaApp, self).init_server_extensions()
        add_voila_handlers(self)
        msg = 'phoila server extension not enabled, manually loading...'
        if not self.nbserver_extensions.get('phoila', False):
            self.log.warn(msg)
            _load_jupyter_server_extension(self)


def _get_core_data_patched():
    """Get the data for the app template.
    """
    with open(os.path.join(HERE, 'staging', 'package.json')) as fid:
        return json.load(fid)

def main():
    os.environ['JUPYTERLAB_DIR'] = os.path.join(sys.prefix, 'share', 'jupyter', 'phoila')
    labextensions.BaseExtensionApp.app_dir = os.environ['JUPYTERLAB_DIR']
    labapp.LabBuildApp.app_dir = os.environ['JUPYTERLAB_DIR']

    # Patch internal function of jupyterlab for now
    # TODO: Make this an extension point in lab itself
    import jupyterlab.commands as commands
    commands._get_core_data = _get_core_data_patched


    PhoilaApp.launch_instance()

if __name__ == '__main__':
    sys.exit(main())
