#!/usr/bin/env python
# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""Django management script."""

import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "alapserver.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
