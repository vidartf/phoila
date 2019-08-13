"""
The functions in this file is based on code from JupyterLab,
copied under the following license:

Copyright (c) 2015 Project Jupyter Contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Semver File License
===================

The semver.py file is from https://github.com/podhmo/python-semver
which is licensed under the "MIT" license.  See the semver.py file for details.
"""

import os
import os.path as osp


def pjoin(*args):
    """Join paths to create a real path.
    """
    return osp.realpath(osp.join(*args))


def get_user_settings_dir(default=None):
    """Get the configured JupyterLab user settings directory.
    """
    settings_dir = os.environ.get('JUPYTERLAB_SETTINGS_DIR')
    settings_dir = settings_dir or default or pjoin(
        jupyter_config_path()[0], 'lab', 'user-settings'
    )
    return osp.realpath(settings_dir)


def get_workspaces_dir(default=None):
    """Get the configured JupyterLab workspaces directory.
    """
    workspaces_dir = os.environ.get('JUPYTERLAB_WORKSPACES_DIR')
    workspaces_dir = workspaces_dir or default or pjoin(
        jupyter_config_path()[0], 'lab', 'workspaces'
    )
    return osp.realpath(workspaces_dir)


def get_app_dir(default=None):
    """Get the configured JupyterLab app directory.
    """
    # Default to the override environment variable.
    if os.environ.get('JUPYTERLAB_DIR'):
        return osp.realpath(os.environ['JUPYTERLAB_DIR'])

    # Use the default locations for data_files.
    app_dir = default or pjoin(sys.prefix, 'share', 'jupyter', 'lab')

    # Check for a user level install.
    # Ensure that USER_BASE is defined
    if hasattr(site, 'getuserbase'):
        site.getuserbase()
    userbase = getattr(site, 'USER_BASE', None)
    if HERE.startswith(userbase) and not app_dir.startswith(userbase):
        app_dir = pjoin(userbase, 'share', 'jupyter', 'lab')

    # Check for a system install in '/usr/local/share'.
    elif (sys.prefix.startswith('/usr') and not
          osp.exists(app_dir) and
          osp.exists('/usr/local/share/jupyter/lab')):
        app_dir = '/usr/local/share/jupyter/lab'

    return osp.realpath(app_dir)
