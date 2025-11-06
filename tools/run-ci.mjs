import { readFile } from "fs/promises";
import { validateCampaigns } from "./validate-campaigns.mjs";

function formatIssue(issue) {
  const tag = issue.type === "error" ? "ERROR" : "WARN";
  return `[${tag}] ${issue.message}`;
}

async function validateI18n() {
  const raw = await readFile(new URL("../config/i18n.json", import.meta.url), "utf8");
  const data = JSON.parse(raw);
  const locales = data.locales || {};
  const fallback = locales["zh-CN"] || {};
  const fallbackKeys = Object.keys(fallback);
  const issues = [];

  Object.entries(locales).forEach(([locale, entries]) => {
    if (locale === "zh-CN") return;
    const missing = fallbackKeys.filter((key) => entries[key] === undefined);
    if (missing.length) {
      issues.push({
        type: "error",
        message: `语言 ${locale} 缺少 ${missing.length} 个键：${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "…" : ""}`,
      });
    }
  });

  return { issues, locales };
}

async function validateMetrics() {
  const raw = await readFile(new URL("../config/metrics.json", import.meta.url), "utf8");
  const data = JSON.parse(raw);
  const issues = [];

  if (!Array.isArray(data.kpis) || !data.kpis.length) {
    issues.push({ type: "warning", message: "metrics.json 中缺少 KPI 配置" });
  }

  (data.kpis || []).forEach((kpi) => {
    if (typeof kpi.value !== "number") {
      issues.push({ type: "error", message: `KPI ${kpi.id ?? "unknown"} 缺少数值` });
    }
    if (!kpi.label) {
      issues.push({ type: "warning", message: `KPI ${kpi.id ?? "unknown"} 缺少 label` });
    }
  });

  if (!Array.isArray(data.funnel)) {
    issues.push({ type: "warning", message: "metrics.json 中缺少 funnel 配置" });
  }

  return { issues, metrics: data };
}

async function main() {
  const results = [];

  const campaignResult = await validateCampaigns();
  results.push(...campaignResult.issues);

  const i18nResult = await validateI18n();
  results.push(...i18nResult.issues);

  const metricsResult = await validateMetrics();
  results.push(...metricsResult.issues);

  if (!results.length) {
    console.info("CI checks passed ✔️");
    return;
  }

  let hasError = false;
  results.forEach((issue) => {
    const line = formatIssue(issue);
    if (issue.type === "error") {
      hasError = true;
      console.error(line);
    } else {
      console.warn(line);
    }
  });

  if (hasError) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("CI checks failed", error);
  process.exitCode = 1;
});
