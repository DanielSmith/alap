<?php

namespace App\Http\Controllers;

use App\Alap\ExpressionParser;
use App\Models\Config;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

class ConfigController extends Controller
{
    /**
     * Log a warning for any hyphenated keys in allLinks, macros, or searchPatterns.
     */
    private function warnHyphens(array $config): void
    {
        $sections = ['allLinks', 'macros', 'searchPatterns'];
        foreach ($sections as $section) {
            if (! isset($config[$section]) || ! is_array($config[$section])) {
                continue;
            }
            foreach (array_keys($config[$section]) as $key) {
                if (str_contains($key, '-')) {
                    error_log("[alap] {$section} key \"{$key}\" contains a hyphen — use underscores. \"-\" is the WITHOUT operator.");
                }
            }
        }
    }

    /**
     * GET /api/configs — list all config names
     */
    public function index(): JsonResponse
    {
        $names = Config::orderBy('name')->pluck('name');

        return response()->json($names);
    }

    /**
     * GET /api/configs/{name} — load a config entry
     */
    public function show(string $name): JsonResponse
    {
        $config = Config::find($name);

        if (! $config) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json([
            'config' => $config->config,
            'meta' => [
                'createdAt' => $config->created_at,
                'updatedAt' => $config->updated_at,
            ],
        ]);
    }

    /**
     * PUT /api/configs/{name} — save (create or update) a config
     */
    public function update(Request $request, string $name): Response
    {
        $data = $request->all();

        if (empty($data)) {
            return response()->json(['error' => 'Request body must be a JSON object'], 400);
        }

        $this->warnHyphens($data);

        Config::updateOrCreate(
            ['name' => $name],
            ['config' => $data],
        );

        return response()->noContent();
    }

    /**
     * DELETE /api/configs/{name} — remove a config
     */
    public function destroy(string $name): Response
    {
        Config::where('name', $name)->delete();

        return response()->noContent();
    }

    /**
     * GET /api/search — search links across all configs
     *
     * Query params: tag, q, regex, fields (comma-separated), config (regex pattern), limit
     */
    public function search(Request $request): JsonResponse
    {
        $tag = $request->query('tag');
        $q = $request->query('q');
        $regex = $request->query('regex');
        $fieldsParam = $request->query('fields');
        $configPattern = $request->query('config');
        $limit = min((int) ($request->query('limit', 100)), 1000);

        if (! $tag && ! $q && ! $regex) {
            return response()->json(['error' => 'Provide at least one of: tag, q, regex'], 400);
        }

        $searchFields = $fieldsParam
            ? array_map('trim', explode(',', $fieldsParam))
            : ['label', 'url', 'tags', 'description', 'id'];

        // Build matcher
        if ($regex) {
            $pattern = '/' . str_replace('/', '\/', $regex) . '/i';
            if (@preg_match($pattern, '') === false) {
                return response()->json(['error' => 'Invalid regex'], 400);
            }
        }

        $configs = Config::orderBy('name')->get();
        $results = [];
        $configsSearched = 0;
        $linksScanned = 0;

        foreach ($configs as $configRow) {
            if ($configPattern && ! preg_match('/' . str_replace('/', '\/', $configPattern) . '/i', $configRow->name)) {
                continue;
            }
            $configsSearched++;

            $allLinks = $configRow->config['allLinks'] ?? [];

            foreach ($allLinks as $id => $link) {
                $linksScanned++;
                $match = false;

                if ($tag) {
                    $match = in_array($tag, $link['tags'] ?? []);
                } elseif ($q) {
                    $term = strtolower($q);
                    if (in_array('label', $searchFields) && str_contains(strtolower($link['label'] ?? ''), $term)) $match = true;
                    if (in_array('url', $searchFields) && str_contains(strtolower($link['url'] ?? ''), $term)) $match = true;
                    if (in_array('description', $searchFields) && str_contains(strtolower($link['description'] ?? ''), $term)) $match = true;
                    if (in_array('id', $searchFields) && str_contains(strtolower($id), $term)) $match = true;
                    if (in_array('tags', $searchFields) && is_array($link['tags'] ?? null)) {
                        foreach ($link['tags'] as $t) {
                            if (str_contains(strtolower($t), $term)) { $match = true; break; }
                        }
                    }
                } elseif ($regex) {
                    if (in_array('label', $searchFields) && preg_match($pattern, $link['label'] ?? '')) $match = true;
                    if (in_array('url', $searchFields) && preg_match($pattern, $link['url'] ?? '')) $match = true;
                    if (in_array('description', $searchFields) && preg_match($pattern, $link['description'] ?? '')) $match = true;
                    if (in_array('id', $searchFields) && preg_match($pattern, $id)) $match = true;
                    if (in_array('tags', $searchFields) && is_array($link['tags'] ?? null)) {
                        foreach ($link['tags'] as $t) {
                            if (preg_match($pattern, $t)) { $match = true; break; }
                        }
                    }
                }

                if ($match) {
                    $results[] = ['configName' => $configRow->name, 'id' => $id, 'link' => $link];
                    if (count($results) >= $limit) break 2;
                }
            }
        }

        return response()->json([
            'results' => $results,
            'configsSearched' => $configsSearched,
            'linksScanned' => $linksScanned,
        ]);
    }

    /**
     * POST /api/cherry-pick — resolve expression against a config, return subset
     *
     * Body: { "source": "configName", "expression": ".coffee + .nyc" }
     */
    public function cherryPick(Request $request): JsonResponse
    {
        $source = $request->input('source');
        $expression = $request->input('expression');

        if (! $source || ! $expression) {
            return response()->json(['error' => 'Provide "source" and "expression"'], 400);
        }

        $config = Config::find($source);
        if (! $config) {
            return response()->json(['error' => "Config \"{$source}\" not found"], 404);
        }

        $allLinks = ExpressionParser::cherryPick($config->config, $expression);

        return response()->json(['allLinks' => $allLinks]);
    }

    /**
     * POST /api/query — server-side expression resolution
     *
     * Body: { "expression": ".bridge", "configName": "demo" }
     *   or: { "expression": ".bridge", "configs": ["demo", "other"] }
     */
    public function query(Request $request): JsonResponse
    {
        $expression = $request->input('expression');
        if (! $expression) {
            return response()->json(['error' => 'Provide "expression"'], 400);
        }

        $configNames = $request->input('configs');
        $configName = $request->input('configName', 'demo');

        if (is_array($configNames)) {
            $configs = [];
            foreach ($configNames as $name) {
                $found = Config::find($name);
                if ($found) {
                    $configs[] = $found->config;
                }
            }
            if (empty($configs)) {
                return response()->json(['error' => 'None of the requested configs were found'], 404);
            }
            $config = ExpressionParser::mergeConfigs(...$configs);
        } else {
            $found = Config::find($configName);
            if (! $found) {
                return response()->json(['error' => "Config \"{$configName}\" not found"], 404);
            }
            $config = $found->config;
        }

        $results = ExpressionParser::resolve($config, $expression);

        return response()->json(['results' => $results]);
    }
}
