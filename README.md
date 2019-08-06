
# phoila

[![Build Status](https://travis-ci.org/vidartf/phoila.svg?branch=master)](https://travis-ci.org/vidartf/phoila)
[![codecov](https://codecov.io/gh/vidartf/phoila/branch/master/graph/badge.svg)](https://codecov.io/gh/vidartf/phoila)


A Phosphor wrapper for Voila

## Installation

You can install using `pip`:

```bash
pip install phoila
```

Or if you use jupyterlab:

```bash
pip install phoila
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

If you are using Jupyter Notebook 5.2 or earlier, you may also need to enable
the nbextension:
```bash
jupyter nbextension enable --py [--sys-prefix|--user|--system] phoila
```
