"""
This code is based on code from voila, copied under the following license:

BSD License

Copyright (c) 2018 Voila contributors.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

  a. Redistributions of source code must retain the above copyright notice,
     this list of conditions and the following disclaimer.

  b. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.

  c. Neither the name of the authors nor the names of the contributors to
     this package may be used to endorse or promote products
     derived from this software without specific prior written
     permission.


THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
"""

import os
import gettext

from jinja2 import Environment, FileSystemLoader
import tornado

from jupyter_server.utils import url_path_join
from jupyter_server.base.handlers import path_regex
from jupyter_server.base.handlers import FileFindHandler

from voila.paths import ROOT, STATIC_ROOT, collect_template_paths, jupyter_path
from voila.handler import VoilaHandler
from voila.treehandler import VoilaTreeHandler
from voila.static_file_handler import MultiStaticFileHandler, WhiteListFileHandler
from voila.configuration import VoilaConfiguration


HERE = os.path.dirname(__file__)
# if the directory above us contains the following paths, it means we are installed in dev mode (pip install -e .)
DEV_MODE = os.path.exists(os.path.join(HERE, "../setup.py")) and os.path.exists(
    os.path.join(HERE, "../share")
)


class PhoilaHandler(VoilaHandler):
    def set_header(self, header, value):
        if header == "Content-Type" and value == "text/html":
            value = "application/json"
        super(PhoilaHandler, self).set_header(header, value)


    @tornado.web.authenticated
    @tornado.gen.coroutine
    def get(self, path=None):
        if (
            self.notebook_path and path and
            path.endswith(self.notebook_path)
        ):  # when we are in single notebook mode but have a path
            yield from super(PhoilaHandler, self).get()
            return
        yield from super(PhoilaHandler, self).get(path)

def add_voila_handlers(server_app):
    web_app = server_app.web_app

    nbconvert_template_paths = []
    static_paths = [STATIC_ROOT]
    template_paths = []

    # common configuration options between the server extension and the application
    voila_configuration = VoilaConfiguration(parent=server_app)
    voila_configuration.template = "phoila"
    voila_configuration.enable_nbextensions = False

    if DEV_MODE:
        search_directories = [
            os.path.abspath(
                os.path.join(HERE, "..", "share", "jupyter", "voila", "templates")
            )
        ]
        collect_template_paths(
            nbconvert_template_paths,
            static_paths,
            template_paths,
            voila_configuration.template,
            search_directories,
        )
    else:
        collect_template_paths(
            nbconvert_template_paths,
            static_paths,
            template_paths,
            voila_configuration.template,
        )

    jenv_opt = {"autoescape": True}
    env = Environment(
        loader=FileSystemLoader(template_paths),
        extensions=["jinja2.ext.i18n"],
        **jenv_opt
    )
    web_app.settings["voila_jinja2_env"] = env

    nbui = gettext.translation(
        "nbui", localedir=os.path.join(ROOT, "i18n"), fallback=True
    )
    env.install_gettext_translations(nbui, newstyle=False)

    host_pattern = ".*$"
    base_url = url_path_join(web_app.settings["base_url"])

    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(base_url, r"/voila/static/(.*)"),
                MultiStaticFileHandler,
                {"paths": static_paths},
            ),
            (
                url_path_join(base_url, r"/voila/files/(.*)"),
                WhiteListFileHandler,
                {
                    'whitelist': voila_configuration.file_whitelist,
                    'blacklist': voila_configuration.file_blacklist,
                    'path': os.path.expanduser(web_app.settings['server_root_dir']),
                },
            ),
        ],
    )

    if server_app.file_to_run:
        notebook_path = os.path.relpath(server_app.file_to_run, server_app.root_dir)
        web_app.add_handlers(
            host_pattern,
            [
                (
                    url_path_join(base_url, r"/voila/render/(.*)"),
                    PhoilaHandler,
                    {
                        'notebook_path': notebook_path,
                        "config": server_app.config,
                        "nbconvert_template_paths": nbconvert_template_paths,
                        "voila_configuration": voila_configuration,
                    },
                ),
            ],
        )
    else:
        web_app.add_handlers(
            host_pattern,
            [
                (
                    url_path_join(base_url, r"/voila/render/(.*)"),
                    PhoilaHandler,
                    {
                        "config": server_app.config,
                        "nbconvert_template_paths": nbconvert_template_paths,
                        "voila_configuration": voila_configuration,
                    },
                ),
                (url_path_join(base_url, "/voila"), VoilaTreeHandler),
                (url_path_join(base_url, r"/voila/tree" + path_regex), VoilaTreeHandler),
            ],
        )
