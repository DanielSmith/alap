# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""Root URL configuration."""

from pathlib import Path

from django.urls import include, path
from django.views.static import serve

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"


def index_view(request):
    return serve(request, "index.html", document_root=str(PUBLIC_DIR))


def static_view(request, path):
    return serve(request, path, document_root=str(PUBLIC_DIR))


urlpatterns = [
    path("", index_view),
    path("", include("configs.urls")),
    path("<path:path>", static_view),
]
