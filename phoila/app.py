import json
import os
import sys

from jupyter_core.application import JupyterApp
from jupyterlab import labapp
from notebook.notebookapp import NotebookApp
from traitlets import Unicode

from ._version import __version__
from .server_extension import _load_jupyter_server_extension
from .voila_handlers import add_voila_handlers

from .commands import *

HERE = os.path.abspath(os.path.dirname(__file__))


_examples = """
phoila build                       # build bundle
phoila list                        # list all configured extensions
phoila install <extension name>    # install an extension
phoila uninstall <extension name>  # uninstall an extension
"""

class PhoilaApp(NotebookApp):
    """Base jupyter labextension command entry point"""
    name = "phoila"
    version = __version__
    description = "Work with Phoila JupyterLab extensions"
    examples = _examples

    default_url = Unicode('/phoila', config=True,
        help="The default URL to redirect to from `/`"
    )

    subcommands = dict(
        install=(InstallPhoilaExtensionApp, "Install phoila extension(s)"),
        update=(UpdatePhoilaExtensionApp, "Update phoila extension(s)"),
        uninstall=(UninstallPhoilaExtensionApp, "Uninstall phoila extension(s)"),
        list=(ListLPhoilaxtensionsApp, "List phoila extensions"),
        link=(LinkPhoilaExtensionApp, "Link phoila extension(s)"),
        unlink=(UnlinkPhoilaExtensionApp, "Unlink phoila extension(s)"),
        enable=(EnableLPhoilaxtensionsApp, "Enable phoila extension(s)"),
        disable=(DisableLPhoilaxtensionsApp, "Disable phoila extension(s)"),
        check=(CheckLPhoilaxtensionsApp, "Check phoila extension(s)"),
        build=(PhoilaBuildApp, labapp.LabBuildApp.description.splitlines()[0]),
        clean=(PhoilaCleanApp, labapp.LabCleanApp.description.splitlines()[0]),
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
