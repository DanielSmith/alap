# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""URL patterns for config endpoints."""

from django.urls import path

from . import views

urlpatterns = [
    path("configs", views.config_list),
    path("configs/<str:name>", views.config_detail),
    path("search", views.search),
    path("cherry-pick", views.cherry_pick),
    path("query", views.query),
]
