/**
 * Howdy‑Hub Bot
 * -----------------
 * A GitHub Action that:
 *   • Welcomes first‑time & returning contributors (issues + PRs)
 *   • Auto‑labels new issues / PRs
 *   • Auto‑assigns the author (optional)
 *   • Auto‑closes items whose title contains a keyword
 *   • Syncs PR assignees with requested reviewers
 *
 * Author:  petherldev
 * License: MIT
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";

// ---------- Types & Constants ------------------------------------------------

/** Shape of the YAML config file (.github/howdy-hub-bot.yml) */
interface BotConfig {
  welcome: {
    first_time_issue: string;
    returning_issue: string;
    first_time_pr: string;
    returning_pr: string;
  };
  labels: {
    issues: string[];
    prs: string[];
  };
  autoCloseOnTitleContains: string; // case‑insensitive keyword
  autoAssignAuthor: boolean;
  autoUnassignIfRemoved: boolean; // reserved for future logic
  syncAssigneesWithReviewers: boolean;
}

/** Fallback config – used if no file found or fields missing */
const DEFAULT_CONFIG: BotConfig = {
  welcome: {
    first_time_issue: "Howdy {{author}} – thanks for your first issue!",
    returning_issue: "Howdy again {{author}} – thanks for another issue!",
    first_time_pr: "Howdy {{author}} – thanks for your first PR!",
    returning_pr: "Howdy again {{author}} – thanks for another PR!"
  },
  labels: {
    issues: [],
    prs: []
  },
  autoCloseOnTitleContains: "complete",
  autoAssignAuthor: true,
  autoUnassignIfRemoved: true,
  syncAssigneesWithReviewers: true
};

const DEFAULT_CONFIG_PATH = ".github/howdy-hub-bot.yml";

// -------- Helper – Read & Merge YAML config ---------------------------------

/**
 * Reads the user‑supplied config file (YAML) and deep‑merges it
 * with DEFAULT_CONFIG so all fields are always populated.
 */
function loadConfig(configPath: string): BotConfig {
  try {
    const full = path.join(process.env.GITHUB_WORKSPACE || "", configPath);
    if (fs.existsSync(full)) {
      const raw = yaml.load(fs.readFileSync(full, "utf8")) as Partial<BotConfig>;
      // Simple shallow merge is enough because our structure is only 2‑level deep
      return {
        ...DEFAULT_CONFIG,
        ...raw,
        welcome: { ...DEFAULT_CONFIG.welcome, ...raw?.welcome },
        labels: { ...DEFAULT_CONFIG.labels, ...raw?.labels }
      };
    }
    core.info(`Config file '${configPath}' not found – using defaults.`);
  } catch (err) {
    core.warning(`Config load failed: ${(err as Error).message}`);
  }
  return DEFAULT_CONFIG;
}

// -------- Helper – First‑time contributor test ------------------------------

/**
 * Queries the GitHub Search API to determine whether `author`
 * has *any* previously opened issue or PR in the same repo.
 *
 * If the search returns only the current item, we treat them as first‑timer.
 */
async function isFirstTimeContributor(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  author: string
): Promise<boolean> {
  const res = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} author:${author}`,
    per_page: 1
  });
  return res.data.total_count <= 1;
}

// ----------------------------------------------------------------------------
//                       EVENT‑SPECIFIC HANDLERS
// ----------------------------------------------------------------------------

async function handleIssue(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  cfg: BotConfig
) {
  /* The payload type differs for issues vs. PRs,
       but issues are simpler (no reviewers field, etc.). */
  const issue = github.context.payload.issue;
  const action = github.context.payload.action as string; // e.g., "opened", "edited"
  if (!issue) throw new Error("Missing issue payload");

  // We only act on "opened" and "reopened" for safety
  if (!["opened", "reopened"].includes(action)) return;

  const { number, user, title } = issue;
  const author = user.login;

  // A. Auto‑close if title contains keyword
  if (title.toLowerCase().includes(cfg.autoCloseOnTitleContains.toLowerCase())) {
    await octokit.rest.issues.update({ owner, repo, issue_number: number, state: "closed" });
    core.info(`Issue #${number} closed – keyword match.`);
    return;
  }

  // B. Apply labels
  if (cfg.labels.issues.length > 0) {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels: cfg.labels.issues
    });
  }

  // C. Assign author
  if (cfg.autoAssignAuthor) {
    await octokit.rest.issues.addAssignees({
      owner,
      repo,
      issue_number: number,
      assignees: [author]
    });
  }

  // D. Welcome comment
  const firstTimer = await isFirstTimeContributor(octokit, owner, repo, author);
  const template = firstTimer ? cfg.welcome.first_time_issue : cfg.welcome.returning_issue;
  const body = template.replace(/{{\s*author\s*}}/g, `@${author}`);

  await octokit.rest.issues.createComment({ owner, repo, issue_number: number, body });
}

async function handlePullRequest(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  cfg: BotConfig
) {
  const pr = github.context.payload.pull_request;
  const action = github.context.payload.action as string; // e.g., "opened"
  if (!pr) throw new Error("Missing pull_request payload");

  // Build only on creation-like actions
  if (!["opened", "reopened", "ready_for_review"].includes(action)) return;

  const { number, title, user, requested_reviewers } = pr;
  const author = user.login;

  // A. Auto‑close PR if title contains keyword
  if (title.toLowerCase().includes(cfg.autoCloseOnTitleContains.toLowerCase())) {
    await octokit.rest.pulls.update({ owner, repo, pull_number: number, state: "closed" });
    core.info(`PR #${number} closed – keyword match.`);
    return;
  }

  // B. Apply labels
  if (cfg.labels.prs.length > 0) {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: number,
      labels: cfg.labels.prs
    });
  }

  // C. Assign author
  if (cfg.autoAssignAuthor) {
    await octokit.rest.issues.addAssignees({
      owner,
      repo,
      issue_number: number,
      assignees: [author]
    });
  }

  // D. Sync assignees with requested reviewers
  if (cfg.syncAssigneesWithReviewers && requested_reviewers?.length) {
    const reviewers = requested_reviewers.map((u: { login: string }) => u.login);
    await octokit.rest.issues.addAssignees({
      owner,
      repo,
      issue_number: number,
      assignees: reviewers
    });
  }

  // E. Welcome comment
  const firstTimer = await isFirstTimeContributor(octokit, owner, repo, author);
  const template = firstTimer ? cfg.welcome.first_time_pr : cfg.welcome.returning_pr;
  const body = template.replace(/{{\s*author\s*}}/g, `@${author}`);

  await octokit.rest.issues.createComment({ owner, repo, issue_number: number, body });
}

// ----------------------------------------------------------------------------
//                            MAIN ENTRYPOINT
// ----------------------------------------------------------------------------

async function run(): Promise<void> {
  try {
    // 1. Resolve token – user‑provided input or default GITHUB_TOKEN
    const token = core.getInput("repo-token") || process.env.GITHUB_TOKEN;
    if (!token)
      throw new Error("GitHub token not supplied (set `repo-token` or pass GITHUB_TOKEN)");

    // 2. Load config (with fallback)
    const configPath = core.getInput("config-path") || DEFAULT_CONFIG_PATH;
    const config = loadConfig(configPath);

    // 3. Init Octokit and route by event type
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    switch (github.context.eventName) {
      case "issues":
        await handleIssue(octokit, owner, repo, config);
        break;
      case "pull_request":
        await handlePullRequest(octokit, owner, repo, config);
        break;
      default:
        core.info(`Event '${github.context.eventName}' not handled – skipping.`);
    }
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

void run(); // fire‑and‑forget – GitHub Actions will await the Promise
