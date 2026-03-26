# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""Config model — stores Alap configurations as native JSON in SQLite."""

from django.db import models


class Config(models.Model):
    name = models.CharField(max_length=255, unique=True)
    config = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "configs"
        ordering = ["name"]

    def __str__(self):
        return self.name
