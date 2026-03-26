# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""WSGI config for alapserver."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "alapserver.settings")

application = get_wsgi_application()
