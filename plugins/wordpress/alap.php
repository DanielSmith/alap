<?php
/**
 * Plugin Name: Alap
 * Plugin URI:  https://alap.info
 * Description: Turn any link into a multi-target menu. Use [alap query=".tag"]text[/alap] in posts and pages.
 * Version:     3.0.0-beta.1
 * Author:      Daniel Smith
 * Author URI:  https://alap.info
 * License:     Apache-2.0
 * License URI: https://www.apache.org/licenses/LICENSE-2.0
 *
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

if (!defined('ABSPATH')) exit;

/**
 * [alap query=".coffee"]text[/alap] → <alap-link query=".coffee">text</alap-link>
 *
 * Attributes:
 *   query    — Alap expression (.tag, @macro, itemId, operators)
 *   config   — Named config to use (optional, for multi-config setups)
 */
function alap_shortcode($atts, $content = '') {
    $atts = shortcode_atts(array(
        'query'  => '',
        'config' => '',
    ), $atts, 'alap');

    if (empty($atts['query'])) {
        return do_shortcode($content);
    }

    $attrs = 'query="' . esc_attr($atts['query']) . '"';
    if (!empty($atts['config'])) {
        $attrs .= ' config="' . esc_attr($atts['config']) . '"';
    }

    return '<alap-link ' . $attrs . '>' . do_shortcode($content) . '</alap-link>';
}
add_shortcode('alap', 'alap_shortcode');

/**
 * Enqueue the Alap IIFE build and register the web component.
 * Config is loaded from alap-config.js in the plugin directory.
 */
function alap_enqueue_scripts() {
    $plugin_url = plugin_dir_url(__FILE__);

    wp_enqueue_script(
        'alap-core',
        $plugin_url . 'alap.iife.js',
        array(),
        '3.0.0-beta.1',
        true
    );

    // Config file — users replace this with their own
    wp_enqueue_script(
        'alap-config',
        $plugin_url . 'alap-config.js',
        array('alap-core'),
        '3.0.0-beta.1',
        true
    );

    // Initialize after both scripts load
    wp_add_inline_script('alap-config',
        'if(typeof Alap!=="undefined"&&typeof alapConfig!=="undefined"){' .
            'Alap.registerConfig(alapConfig);' .
            'Alap.defineAlapLink();' .
        '}'
    );
}
add_action('wp_enqueue_scripts', 'alap_enqueue_scripts');

/**
 * Add basic styling for alap-link elements.
 * Users can override in their theme CSS.
 */
function alap_inline_styles() {
    $css = '
        alap-link {
            color: inherit;
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 2px;
            cursor: pointer;
        }
        alap-link:hover {
            text-decoration-style: solid;
        }
    ';
    wp_add_inline_style('wp-block-library', $css);
}
add_action('wp_enqueue_scripts', 'alap_inline_styles');
