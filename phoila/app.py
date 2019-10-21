import json
import os
import sys

from .serverapp import ServerApp
from jupyterlab import labapp
from traitlets import List, Unicode, default, observe

from jupyter_server.utils import url_path_join

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


class PhoilaApp(ServerApp):
    """Base jupyter labextension command entry point"""

    name = "phoila"
    version = __version__
    description = "The Phoila application"
    examples = _examples

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

    default_services = List(
        Unicode(),
        config=False,  # Not user configurable!
        help="default services to load",
        default_value=(
            "jupyter_server.kernelspecs.handlers",
            "jupyter_server.services.api.handlers",
            "jupyter_server.services.config.handlers",
            "jupyter_server.services.kernels.handlers",
            "jupyter_server.services.kernelspecs.handlers",
            "jupyter_server.services.security.handlers",
            "jupyter_server.services.shutdown",
        ),
    )

    mathjax_url = Unicode(
        "",
        config=True,
        help="""A custom url for MathJax.js.
        Should be in the form of a case-sensitive url to MathJax,
        for example:  /static/components/MathJax/MathJax.js
        """,
    )

    @default("mathjax_url")
    def _default_mathjax_url(self):
        if not self.enable_mathjax:
            return u""
        return "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.6/MathJax.js"

    @observe("mathjax_url")
    def _update_mathjax_url(self, change):
        new = change["new"]
        if new and not self.enable_mathjax:
            # enable_mathjax=False overrides mathjax_url
            self.mathjax_url = u""
        else:
            self.log.info("Using MathJax: %s", new)

    mathjax_config = Unicode(
        "TeX-AMS-MML_HTMLorMML-full,Safe",
        config=True,
        help="""The MathJax.js configuration file that is to be used.""",
    )

    @observe("mathjax_config")
    def _update_mathjax_config(self, change):
        self.log.info("Using MathJax configuration file: %s", change["new"])

    def initialize(self, *args, **kwargs):
        """Load the extension we need.
        """
        super(PhoilaApp, self).initialize(*args, **kwargs)
        if not self._dispatching:
            self.kernel_manager.allowed_message_types = [
                'comm_open',
                'comm_msg',
                'comm_info_request',
                'kernel_info_request',
                'shutdown_request'
            ]
            if self.subapp is None:
                _load_jupyter_server_extension(self)
                add_voila_handlers(self)
                # Clear this, as we run things differently:
                self.file_to_run = ''


def main():
    os.environ["JUPYTERLAB_DIR"] = os.path.join(
        sys.prefix, "share", "jupyter", "phoila"
    )
    labextensions.BaseExtensionApp.app_dir = os.environ["JUPYTERLAB_DIR"]

    PhoilaApp.launch_instance()


if __name__ == "__main__":
    sys.exit(main())
