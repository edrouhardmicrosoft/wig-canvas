import { Command } from 'commander';
import { runInitWizard } from './init.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Interactive setup for agent skill prompts (repo-local)')
    .action(async () => {
      const result = await runInitWizard(process.cwd());

      console.log(`Repo root: ${result.repoRoot}`);

      if (result.installed.length > 0) {
        console.log('Installed:');
        for (const item of result.installed) {
          console.log(
            `  - ${item.target}: ${item.dest}${item.overwritten ? ' (overwritten)' : ''}`
          );
        }
      }

      if (result.skipped.length > 0) {
        console.log('Skipped:');
        for (const item of result.skipped) {
          console.log(`  - ${item.target}: ${item.dest} (${item.reason})`);
        }
      }

      if (result.installed.length === 0 && result.skipped.length === 0) {
        console.log('No changes made.');
      }
    });
}
