# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0

"""Function-based views for the 7 Alap config REST endpoints."""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "shared"))
from validate_regex import validate_regex
from expression_parser import cherry_pick_links, merge_configs, resolve_expression

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Config


def warn_hyphens(config: dict) -> None:
    """Log a warning for any hyphenated keys in allLinks, macros, or searchPatterns."""
    sections = ("allLinks", "macros", "searchPatterns")
    for section in sections:
        mapping = config.get(section)
        if not isinstance(mapping, dict):
            continue
        for key in mapping:
            if "-" in key:
                print(
                    f'[alap] {section} key "{key}" contains a hyphen '
                    f'— use underscores. "-" is the WITHOUT operator.',
                    flush=True,
                )


# ---------------------------------------------------------------------------
# 1. GET /configs — list all config names
# ---------------------------------------------------------------------------


@require_GET
def config_list(request):
    names = list(Config.objects.values_list("name", flat=True))
    return JsonResponse(names, safe=False)


# ---------------------------------------------------------------------------
# 2–4. GET / PUT / DELETE  /configs/<name>
# ---------------------------------------------------------------------------


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def config_detail(request, name):
    if request.method == "GET":
        return _load_config(name)
    if request.method == "PUT":
        return _save_config(request, name)
    return _delete_config(name)


def _load_config(name):
    try:
        cfg = Config.objects.get(name=name)
    except Config.DoesNotExist:
        return JsonResponse({"error": "not found"}, status=404)

    return JsonResponse({
        "config": cfg.config,
        "meta": {
            "createdAt": cfg.created_at.isoformat(),
            "updatedAt": cfg.updated_at.isoformat(),
        },
    })


def _save_config(request, name):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "invalid JSON"}, status=400)

    warn_hyphens(body)
    Config.objects.update_or_create(
        name=name,
        defaults={"config": body},
    )
    return HttpResponse(status=204)


def _delete_config(name):
    deleted, _ = Config.objects.filter(name=name).delete()
    if not deleted:
        return JsonResponse({"error": "not found"}, status=404)
    return HttpResponse(status=204)


# ---------------------------------------------------------------------------
# 5. GET /search — search across all configs
# ---------------------------------------------------------------------------


@require_GET
def search(request):
    tag = request.GET.get("tag", "")
    q = request.GET.get("q", "")
    regex = request.GET.get("regex", "")
    fields_param = request.GET.get("fields", "label,url,tags,description,id")
    config_pattern = request.GET.get("config", "")

    try:
        limit = min(int(request.GET.get("limit", "100")), 1000)
    except ValueError:
        limit = 100

    if limit < 1:
        limit = 100

    fields = [f.strip() for f in fields_param.split(",") if f.strip()]

    # Compile regex once if provided
    compiled_regex = None
    if regex:
        check = validate_regex(regex)
        if not check["safe"]:
            return JsonResponse({"error": f"Invalid regex: {check['reason']}"}, status=400)
        try:
            compiled_regex = re.compile(regex, re.IGNORECASE)
        except re.error:
            return JsonResponse({"error": "invalid regex"}, status=400)

    # Compile config name filter
    config_re = None
    if config_pattern:
        check = validate_regex(config_pattern)
        if not check["safe"]:
            return JsonResponse({"error": f"Invalid config regex: {check['reason']}"}, status=400)
        try:
            config_re = re.compile(config_pattern, re.IGNORECASE)
        except re.error:
            return JsonResponse({"error": "invalid config regex"}, status=400)

    configs = Config.objects.all()
    results = []
    configs_searched = 0
    links_scanned = 0

    for cfg in configs:
        if config_re and not config_re.search(cfg.name):
            continue
        configs_searched += 1

        all_links = cfg.config.get("allLinks", {})
        for link_id, link in all_links.items():
            links_scanned += 1
            if len(results) >= limit:
                break

            if _matches(link, link_id, tag, q, compiled_regex, fields):
                results.append({
                    "configName": cfg.name,
                    "id": link_id,
                    "link": link,
                })

        if len(results) >= limit:
            break

    return JsonResponse({
        "results": results,
        "configsSearched": configs_searched,
        "linksScanned": links_scanned,
    })


def _matches(link, link_id, tag, q, compiled_regex, fields):
    """Check whether a link matches the search criteria."""
    if tag:
        tags = link.get("tags", [])
        if tag not in tags:
            return False

    if q:
        if not _text_match(link, link_id, q, fields):
            return False

    if compiled_regex:
        if not _regex_match(link, link_id, compiled_regex, fields):
            return False

    # At least one filter must be active
    return bool(tag or q or compiled_regex)


def _field_values(link, link_id, fields):
    """Yield string values for the requested fields."""
    for field in fields:
        if field == "id":
            yield link_id
        elif field == "tags":
            for t in link.get("tags", []):
                yield t
        else:
            val = link.get(field, "")
            if val:
                yield str(val)


def _text_match(link, link_id, q, fields):
    q_lower = q.lower()
    return any(q_lower in val.lower() for val in _field_values(link, link_id, fields))


def _regex_match(link, link_id, compiled_regex, fields):
    return any(compiled_regex.search(val) for val in _field_values(link, link_id, fields))


# ---------------------------------------------------------------------------
# 6. POST /cherry-pick — resolve expression against a config, return subset
# ---------------------------------------------------------------------------


@csrf_exempt
@require_http_methods(["POST"])
def cherry_pick(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "invalid JSON"}, status=400)

    source = body.get("source")
    expression = body.get("expression")

    if not source or not expression:
        return JsonResponse({"error": 'Provide "source" and "expression"'}, status=400)

    try:
        cfg = Config.objects.get(name=source)
    except Config.DoesNotExist:
        return JsonResponse({"error": f'Config "{source}" not found'}, status=404)

    all_links = cherry_pick_links(cfg.config, expression)

    return JsonResponse({"allLinks": all_links})


# ---------------------------------------------------------------------------
# 7. POST /query — server-side expression resolution
# ---------------------------------------------------------------------------


@csrf_exempt
@require_http_methods(["POST"])
def query(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "invalid JSON"}, status=400)

    expression = body.get("expression")
    if not expression:
        return JsonResponse({"error": 'Provide "expression"'}, status=400)

    config_names = body.get("configs")
    config_name = body.get("configName", "demo")

    if isinstance(config_names, list):
        configs = []
        for name in config_names:
            try:
                cfg = Config.objects.get(name=name)
                configs.append(cfg.config)
            except Config.DoesNotExist:
                pass

        if not configs:
            return JsonResponse({"error": "None of the requested configs were found"}, status=404)

        config = merge_configs(*configs)
    else:
        try:
            cfg = Config.objects.get(name=config_name)
        except Config.DoesNotExist:
            return JsonResponse({"error": f'Config "{config_name}" not found'}, status=404)

        config = cfg.config

    results = resolve_expression(config, expression)

    return JsonResponse({"results": results}, safe=False)
