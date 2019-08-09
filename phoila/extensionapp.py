import json
import os
import sys

from jupyter_core.application import JupyterApp
from jupyterlab import labextensions, labapp

from ._version import __version__

HERE = os.path.abspath(os.path.dirname(__file__))


_examples = """
phoila build                       # build bundle
phoila list                        # list all configured labextensions
phoila <extension name>    # install a labextension
phoila <extension name>  # uninstall a labextension
"""

class PhoilaApp(JupyterApp):
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

    def start(self):
        """Perform the App's functions as configured"""
        super(PhoilaApp, self).start()

        # The above should have called a subcommand and raised NoStart; if we
        # get here, it didn't, so we should self.log.info a message.
        subcmds = ", ".join(sorted(self.subcommands))
        self.exit("Please supply at least one subcommand: %s" % subcmds)


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
