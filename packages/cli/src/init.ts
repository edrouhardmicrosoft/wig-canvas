import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

type TargetKey = 'opencode' | 'codex' | 'copilot' | 'claude';

type InitResult = {
  repoRoot: string;
  installed: Array<{ target: TargetKey; dest: string; overwritten: boolean }>;
  skipped: Array<{ target: TargetKey; dest: string; reason: 'exists' | 'cancelled' }>;
};

function findRepoRoot(startDir: string): string {
  // Walk up until we find .git or package.json.
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, '.git')) || existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) return startDir;
    dir = parent;
  }
}

function getPackageRoot(): string {
  const here = fileURLToPath(import.meta.url);
  return resolve(dirname(here), '..');
}

function getTemplatePath(target: TargetKey): string {
  const packageRoot = getPackageRoot();
  // In repo/dev, packageRoot = packages/cli/src/..; templates live at repo root.
  const repoRootGuess = resolve(packageRoot, '../..');

  const targetRel =
    target === 'opencode'
      ? 'integrations/opencode/canvas-agent-cli/SKILL.md'
      : target === 'codex'
        ? 'integrations/codex/canvas-agent-cli/SKILL.md'
        : target === 'copilot'
          ? 'integrations/copilot/canvas-agent-cli.agent.md'
          : 'integrations/claude/canvas-agent-cli.prompt.md';

  const fromRepo = resolve(repoRootGuess, targetRel);
  if (existsSync(fromRepo)) return fromRepo;

  const fromPackage = resolve(packageRoot, 'integrations', targetRel.slice('integrations/'.length));
  return fromPackage;
}

function getDefaultDest(repoRoot: string, target: TargetKey): string {
  switch (target) {
    case 'opencode':
      return join(repoRoot, '.opencode/skill/canvas-agent-cli/SKILL.md');
    case 'codex':
      return join(repoRoot, '.codex/skills/canvas-agent-cli/SKILL.md');
    case 'copilot':
      return join(repoRoot, '.github/agents/canvas-agent-cli.agent.md');
    case 'claude':
      return join(repoRoot, 'claude/canvas-agent-cli.prompt.md');
  }
}

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function safeCopyFile(options: {
  from: string;
  to: string;
  overwrite: boolean;
}): Promise<{ ok: true; overwritten: boolean } | { ok: false; reason: 'exists' }> {
  const existed = existsSync(options.to);
  if (existed && !options.overwrite) {
    return { ok: false, reason: 'exists' };
  }

  await ensureParentDir(options.to);
  await copyFile(options.from, options.to);
  return { ok: true, overwritten: existed && options.overwrite };
}

export async function runInitWizard(cwd: string): Promise<InitResult> {
  const repoRoot = findRepoRoot(cwd);

  const targetsResponse = await prompts({
    type: 'multiselect',
    name: 'targets',
    message: 'Select integrations to install (repo-local)',
    choices: [
      { title: 'OpenCode (.opencode)', value: 'opencode', selected: true },
      { title: 'Codex (.codex)', value: 'codex', selected: true },
      { title: 'GitHub Copilot (.github/agents)', value: 'copilot', selected: true },
      { title: 'Claude (repo-local prompt file)', value: 'claude', selected: true },
    ],
    min: 1,
  });

  if (!targetsResponse.targets) {
    return { repoRoot, installed: [], skipped: [] };
  }

  const overwriteAllResponse = await prompts({
    type: 'toggle',
    name: 'overwriteAll',
    message: 'Overwrite existing files?',
    initial: false,
    active: 'yes',
    inactive: 'no',
  });

  const selectedTargets = targetsResponse.targets as TargetKey[];
  const overwriteAll = Boolean(overwriteAllResponse.overwriteAll);

  const installed: InitResult['installed'] = [];
  const skipped: InitResult['skipped'] = [];

  for (const target of selectedTargets) {
    const defaultDest = getDefaultDest(repoRoot, target);

    const destResponse = await prompts({
      type: 'text',
      name: 'dest',
      message: `Install path for ${target}`,
      initial: defaultDest,
    });

    if (!destResponse.dest) {
      skipped.push({ target, dest: defaultDest, reason: 'cancelled' });
      continue;
    }

    const from = getTemplatePath(target);

    try {
      // Validate template exists and is readable.
      await readFile(from, 'utf-8');
    } catch {
      throw new Error(`Missing template for ${target} at: ${from}`);
    }

    const copyResult = await safeCopyFile({ from, to: destResponse.dest, overwrite: overwriteAll });
    if (!copyResult.ok) {
      if (!overwriteAll) {
        const overwriteOne = await prompts({
          type: 'confirm',
          name: 'overwrite',
          message: `File exists at ${destResponse.dest}. Overwrite?`,
          initial: false,
        });
        if (overwriteOne.overwrite) {
          await safeCopyFile({ from, to: destResponse.dest, overwrite: true });
          installed.push({ target, dest: destResponse.dest, overwritten: true });
        } else {
          skipped.push({ target, dest: destResponse.dest, reason: 'exists' });
        }
      } else {
        skipped.push({ target, dest: destResponse.dest, reason: 'exists' });
      }
      continue;
    }

    installed.push({ target, dest: destResponse.dest, overwritten: overwriteAll });
  }

  return { repoRoot, installed, skipped };
}
