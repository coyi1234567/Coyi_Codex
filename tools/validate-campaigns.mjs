import { readFile } from "fs/promises";
import { resolve } from "path";
import { pathToFileURL } from "url";

const WARNING = "warning";
const ERROR = "error";

export async function validateCampaigns({ locale = "en-US", maxMessageLength = 60 } = {}) {
  const raw = await readFile(new URL("../config/campaigns.json", import.meta.url), "utf8");
  const data = JSON.parse(raw);
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const now = Date.now();

  const issues = [];

  campaigns.forEach((campaign) => {
    const start = campaign.startAt ? Date.parse(campaign.startAt) : null;
    const end = campaign.endAt ? Date.parse(campaign.endAt) : null;
    const name = campaign.title || campaign.name || campaign.id || "campaign";

    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      issues.push({
        type: ERROR,
        message: `活动 ${name} 的结束时间早于开始时间`,
      });
    }

    if (Number.isFinite(end) && end < now) {
      issues.push({
        type: WARNING,
        message: `活动 ${name} 已过期 (${campaign.endAt})`,
      });
    }

    const locales = campaign.locales && typeof campaign.locales === "object" ? campaign.locales : {};
    const localized = locales[locale];
    if (!localized || !localized.title || !localized.message) {
      issues.push({
        type: WARNING,
        message: `活动 ${name} 缺少 ${locale} 语言文案，将会退回默认值`,
      });
    }

    const message = localized?.message || campaign.message || "";
    if (typeof message === "string" && message.length > maxMessageLength) {
      issues.push({
        type: WARNING,
        message: `活动 ${name} 的文案长度 ${message.length} 超过 ${maxMessageLength} 字`,
      });
    }
  });

  if (!data.fallback) {
    issues.push({ type: WARNING, message: "缺少 fallback 活动配置" });
  }

  return { issues, campaigns };
}

const executedAsScript =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (executedAsScript) {
  validateCampaigns()
    .then(({ issues }) => {
      if (!issues.length) {
        console.info("campaign validation passed");
        return;
      }
      issues.forEach((issue) => {
        const tag = issue.type === ERROR ? "ERROR" : "WARN";
        console[issue.type === ERROR ? "error" : "warn"](`[${tag}] ${issue.message}`);
      });
      const hasError = issues.some((issue) => issue.type === ERROR);
      if (hasError) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error("campaign validation failed", error);
      process.exitCode = 1;
    });
}
