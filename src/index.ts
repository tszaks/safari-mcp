#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { SafariBridge, type SafariTarget } from './safari.js';
import { SafariPageTools } from './page.js';
import { SafariAutomationTools } from './automation.js';
import { TOOL_DEFINITIONS } from './tooling.js';

function textResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing or invalid '${field}'`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function optionalInt(value: unknown, field: string, minValue: number, maxValue: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  let parsed: number | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    parsed = Math.trunc(value);
  } else if (typeof value === 'string' && value.trim()) {
    parsed = Number.parseInt(value.trim(), 10);
  }

  if (parsed === null || !Number.isInteger(parsed)) {
    throw new Error(`Missing or invalid '${field}'`);
  }

  if (parsed < minValue || parsed > maxValue) {
    throw new Error(`'${field}' must be between ${minValue} and ${maxValue}`);
  }

  return parsed;
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }

  throw new Error(`Missing or invalid '${field}'`);
}

function optionalNumber(value: unknown, field: string, minValue: number, maxValue: number): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Missing or invalid '${field}'`);
  }

  if (parsed < minValue || parsed > maxValue) {
    throw new Error(`'${field}' must be between ${minValue} and ${maxValue}`);
  }

  return parsed;
}

function optionalIntArray(value: unknown, field: string): number[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`Missing or invalid '${field}'`);
  }

  return value.map((item) => {
    if (typeof item === 'number' && Number.isInteger(item) && item > 0) return item;
    if (typeof item === 'string' && item.trim()) {
      const parsed = Number.parseInt(item.trim(), 10);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    throw new Error(`Missing or invalid '${field}'`);
  });
}

function targetFromArgs(args: Record<string, unknown>): SafariTarget {
  return {
    window_index: optionalInt(args.window_index, 'window_index', 1, 999),
    tab_index: optionalInt(args.tab_index, 'tab_index', 1, 999),
  };
}

const bridge = new SafariBridge();
const pageTools = new SafariPageTools(bridge);
const automationTools = new SafariAutomationTools(bridge);

const server = new Server(
  {
    name: 'safari-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const target = targetFromArgs(args);

  switch (request.params.name) {
    case 'safari_get_active_tab':
      return textResult(await bridge.getActiveTab());
    case 'safari_list_tabs':
      return textResult(await bridge.listTabs(target));
    case 'safari_list_windows':
      return textResult(await bridge.listWindows());
    case 'safari_open_url':
      return textResult(await bridge.openUrl(requireString(args.url, 'url'), target));
    case 'safari_new_tab':
      return textResult(await bridge.newTab(optionalString(args.url), target));
    case 'safari_close_tab':
      return textResult(await bridge.closeTab(target));
    case 'safari_close_tabs':
      return textResult(await bridge.closeTabs(
        optionalInt(args.window_index, 'window_index', 1, 999),
        optionalIntArray(args.tab_indices, 'tab_indices'),
      ));
    case 'safari_activate_tab':
      return textResult(await bridge.activateTab(target));
    case 'safari_activate_window':
      return textResult(await bridge.activateWindow(optionalInt(args.window_index, 'window_index', 1, 999) ?? 1));
    case 'safari_reload_tab':
      return textResult(await bridge.reloadTab(target));
    case 'safari_go_back':
      return textResult(await bridge.goBack(target));
    case 'safari_go_forward':
      return textResult(await bridge.goForward(target));
    case 'safari_get_page_content':
      return textResult(await pageTools.getPageContent(
        (optionalString(args.mode) as 'visible' | 'readability' | 'full_dom' | undefined) ?? 'readability',
        target,
      ));
    case 'safari_get_page_markdown':
      return textResult(await pageTools.getPageMarkdown(
        (optionalString(args.mode) as 'visible' | 'readability' | 'full_dom' | undefined) ?? 'readability',
        target,
      ));
    case 'safari_snapshot_page':
      return textResult(await pageTools.snapshotPage(target));
    case 'safari_get_page_html':
      return textResult(await pageTools.getPageHtml(target));
    case 'safari_get_selection':
      return textResult(await pageTools.getSelection(target));
    case 'safari_extract_links':
      return textResult(await pageTools.extractLinks(optionalInt(args.limit, 'limit', 1, 1000) ?? 100, target));
    case 'safari_extract_images':
      return textResult(await pageTools.extractImages(optionalInt(args.limit, 'limit', 1, 1000) ?? 100, target));
    case 'safari_find_in_page':
      return textResult(await pageTools.findInPage(
        requireString(args.query, 'query'),
        optionalInt(args.limit, 'limit', 1, 1000) ?? 20,
        target,
      ));
    case 'safari_summarize_page':
      return textResult(await pageTools.summarizePage(target));
    case 'safari_run_javascript':
      return textResult(await automationTools.runJavaScript(requireString(args.script, 'script'), target));
    case 'safari_query_elements':
      return textResult(await automationTools.queryElements(
        requireString(args.selector, 'selector'),
        optionalInt(args.limit, 'limit', 1, 1000) ?? 20,
        target,
      ));
    case 'safari_click_element':
      return textResult(await automationTools.clickElement(requireString(args.selector, 'selector'), target));
    case 'safari_type_into_element':
      return textResult(await automationTools.typeIntoElement(
        requireString(args.selector, 'selector'),
        requireString(args.text, 'text'),
        optionalBoolean(args.clear, 'clear') ?? true,
        optionalBoolean(args.submit, 'submit') ?? false,
        target,
      ));
    case 'safari_submit_form':
      return textResult(await automationTools.submitForm(requireString(args.selector, 'selector'), target));
    case 'safari_scroll_page':
      return textResult(await automationTools.scrollPage(
        {
          top: optionalInt(args.top, 'top', 0, 10_000_000),
          left: optionalInt(args.left, 'left', 0, 10_000_000),
          percent: optionalNumber(args.percent, 'percent', 0, 1),
          behavior: (optionalString(args.behavior) as 'smooth' | 'auto' | undefined) ?? 'auto',
        },
        target,
      ));
    case 'safari_wait_for_element':
      return textResult(await automationTools.waitForElement(
        requireString(args.selector, 'selector'),
        optionalInt(args.timeout_ms, 'timeout_ms', 100, 60_000) ?? 5_000,
        optionalInt(args.interval_ms, 'interval_ms', 50, 5_000) ?? 250,
        target,
      ));
    case 'safari_wait_for_navigation':
      return textResult(await automationTools.waitForNavigation(
        {
          timeoutMs: optionalInt(args.timeout_ms, 'timeout_ms', 100, 60_000) ?? 5_000,
          intervalMs: optionalInt(args.interval_ms, 'interval_ms', 50, 5_000) ?? 250,
        },
        target,
      ));
    case 'safari_wait_for_text':
      return textResult(await automationTools.waitForText(
        {
          text: optionalString(args.text),
          textGone: optionalString(args.textGone),
          timeoutMs: optionalInt(args.timeout_ms, 'timeout_ms', 100, 60_000) ?? 5_000,
          intervalMs: optionalInt(args.interval_ms, 'interval_ms', 50, 5_000) ?? 250,
        },
        target,
      ));
    case 'safari_list_forms':
      return textResult(await automationTools.listForms(target));
    case 'safari_screenshot_visible_area':
      return textResult(await bridge.screenshotVisibleArea());
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
