#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Vidar Tonaas Fauske.
# Distributed under the terms of the Modified BSD License.

from ._version import __version__, version_info

def load_jupyter_server_extension(nb_server_app):
    # Wrap this here to avoid pulling in webapp in a normal run
    from .server_extension import _load_jupyter_server_extension
    _load_jupyter_server_extension(nb_server_app)


def _jupyter_server_extension_paths():
    return [{'module': 'phoila'}]
