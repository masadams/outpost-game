#!/usr/bin/env node
/**
 * Runs only the browser specs that cover what changed, instead of the whole suite (about 50 minutes).
 *
 *   node scripts/browser-tests.mjs            specs for everything changed since main, plus the smoke spec
 *   node scripts/browser-tests.mjs --list     print the choice and why, without running
 *   node scripts/browser-tests.mjs --all      the whole suite
 *   node scripts/browser-tests.mjs --base X   compare against another branch or commit
 *
 * Set PW_CONFIG to use another Playwright config. Unit tests (npm test) always run in full; they are fast.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ALL = 'ALL';

/** Always run: opens every window on a new game and a mid-game base and checks for errors. */
const ALWAYS = ['smoke'];

/**
 * What to run when a path changes. First match wins. A list names spec files (without ".spec.ts");
 * ALL means the change is too central to narrow down.
 */
const RULES = [
  // Nothing in the browser depends on these.
  [/^docs\/|\.md$|^tests\/[^/]+\.test\.ts$|^scripts\//, []],
  // A changed spec runs itself; the shared helpers affect every spec.
  [/^tests\/browser\/(game|screen)\.ts$/, ALL],
  [/^tests\/browser\/(.+)\.spec\.ts$/, m => [m[1]]],
  // The centre of the game: everything passes through these.
  [/^src\/(main\.ts|style\.css)$/, ALL],
  [/^src\/render\/FlightScene\.ts$|^src\/ui\/hud\.ts$|^src\/sim\/(world|colony|physics)\.ts$/, ALL],
  [/^(package(-lock)?\.json|vite\.config|playwright\.|tsconfig)/, ALL],
  // Screens.
  [/^src\/ui\/(map\/|Navigation)/, ['mapControls', 'exploration', 'worlds', 'pods', 'signal', 'wrecks']],
  [/^src\/ui\/base\//, ['base', 'researchTree', 'scheduling', 'supply', 'pods', 'signal', 'priorities', 'storm', 'contextMenu', 'workspace']],
  [/^src\/ui\/build\//, ['directControls', 'focusMode', 'progression', 'flight']],
  [/^src\/ui\/flight\//, ['instrumentConsole', 'flightWarnings', 'flightRegion', 'storm', 'story', 'focusMode']],
  [/^src\/ui\/ship\//, ['parts', 'readiness', 'towing']],
  [/^src\/ui\/(dialogs\/|GameMenu|Settings|Help)/, ['menu', 'presentation', 'checkpointRecovery']],
  [/^src\/ui\/(Objectives|noticeLog|notices)/, ['story', 'milestones', 'focusMode']],
  [/^src\/ui\/.*\.css$/, ['menu', 'base', 'mapControls', 'story', 'overhaul', 'instrumentConsole']],
  [/^src\/ui\/OperationsDock/, ['windowPause', 'base', 'mapControls', 'overhaul']],
  [/^src\/ui\/(InstrumentPanel|instruments|FlightTools)/, ['instrumentConsole', 'flightWarnings', 'flightRegion']],
  [/^src\/ui\/(CommandConsole|techTree|progression|shipFitting|buildingUpgrade)/, ['workspace', 'parts', 'progression', 'researchTree', 'command']],
  [/^src\/ui\/(colony|blueprints|BuildingLabels|colonyPolicy|freight|readiness)/, ['directControls', 'priorities', 'overhaul', 'readiness', 'automation']],
  [/^src\/ui\/(combat|defence)/, ['defence', 'command']],
  [/^src\/ui\/(habitats|shields|towing|autopilot)\.ts$/, m => [m[1] === 'autopilot' ? 'automation' : m[1]]],
  // Shared plumbing that every screen leans on.
  [/^src\/ui\/(dom|context|controlKeys|icons|shortcuts)\.ts$/, ALL],
  // Other layers.
  [/^src\/persistence\//, ['menu', 'checkpointRecovery', 'flight', 'story']],
  [/^src\/audio\//, ['audio', 'flightWarnings']],
  [/^src\/(input|preferences)\//, ['presentation', 'directControls', 'focusMode', 'menu']],
  [/^src\/render\//, ['rotation', 'atmosphere', 'flight']],
  // Simulation, by subject. Unit tests cover the rules; these check the screens that show them.
  [/^src\/sim\/(storm|meteor|rockFall|defence|intercept|observatory)/, ['storm', 'defence']],
  [/^src\/sim\/(signal|expedition|farWorlds)/, ['signal']],
  [/^src\/sim\/(pods|supply|freight|manifests)/, ['pods', 'supply', 'overhaul']],
  [/^src\/sim\/(story|keystones|seedShip|unlocks|objectives|blueprintNotice|storyGates|finds)/, ['story', 'focusMode', 'milestones', 'progression']],
  [/^src\/sim\/(boot|power|grid|generators|scheduling|colonyPolicy|construction|facilityStats|tiers)/, ['base', 'scheduling', 'priorities', 'facilityMoon', 'directControls']],
  [/^src\/sim\/(habitat|airMachines)/, ['habitats']],
  [/^src\/sim\/shield/, ['shields']],
  [/^src\/sim\/towing/, ['towing']],
  [/^src\/sim\/wrecks/, ['wrecks']],
  [/^src\/sim\/(research|progression|equipment|shipStats|shipProfile)/, ['progression', 'parts', 'researchTree', 'workspace']],
  [/^src\/sim\/(autopilot|guidance|flightController)/, ['automation']],
  [/^src\/sim\/events/, ['events']],
  [/^src\/sim\/(exploration|probes|drift|crystal)/, ['exploration']],
  [/^src\/sim\/(flight|handling|trajectory|environment|preflight|readiness)/, ['flight', 'flightRegion', 'flightWarnings', 'rotation', 'atmosphere', 'readiness']],
  [/^src\/sim\/(mining|surface|geology|survey|minerDrone|nacreSurvey)/, ['surfaceMining']],
  [/^src\/sim\/(celestial|nature|star|sun|aurora)/, ['worlds', 'rotation', 'atmosphere']],
  [/^src\/sim\/(combat|weapons|command|drones)/, ['defence', 'command']],
  [/^src\/sim\/(building|colonyPlacement|colonyService|headquarters)/, ['base', 'directControls', 'contextMenu', 'defence']],
  [/^src\/sim\/(cargo|resources|shipMass|tripFuel|bodies)/, ['flight', 'overhaul', 'readiness', 'surfaceMining']],
  [/^src\/sim\/messages/, ['story', 'storm', 'menu']],
  // Constants and helpers used across the whole simulation.
  [/^src\/sim\/(config|colonyConfig|droneConfig|localWorld|math|random|seed|clock)\.ts$/, ALL],
  [/^src\/sim\/(astronaut|crewOrders|bag|stations)/, ['directControls', 'habitats', 'surfaceMining']],
];

/**
 * The specs to run for a list of changed paths.
 * Returns ALL, or spec names with the reason each was chosen; "unknown" lists source files no rule covers.
 */
export function specsFor(files) {
  const chosen = new Map();
  const unknown = [];
  for (const file of files) {
    const rule = RULES.find(([pattern]) => pattern.test(file));
    if (!rule) {
      if (file.startsWith('src/')) unknown.push(file);
      continue;
    }
    const target = typeof rule[1] === 'function' ? rule[1](file.match(rule[0])) : rule[1];
    if (target === ALL) return { all: true, because: file, specs: new Map(), unknown };
    for (const spec of target) if (!chosen.has(spec)) chosen.set(spec, file);
  }
  // A source file nobody has classified is not a reason to skip checks: say so and fall back to everything.
  if (unknown.length > 0) return { all: true, because: unknown[0], specs: new Map(), unknown };
  if (chosen.size > 0 || files.some(f => f.startsWith('src/'))) for (const spec of ALWAYS) if (!chosen.has(spec)) chosen.set(spec, 'always');
  return { all: false, because: '', specs: chosen, unknown };
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean);
}

/** Paths changed since the branch left the base, including work not committed yet. */
function changedFiles(base) {
  const from = git('merge-base', 'HEAD', base)[0];
  const committed = git('diff', '--name-only', from, 'HEAD');
  const working = git('diff', '--name-only', 'HEAD');
  const untracked = git('ls-files', '--others', '--exclude-standard');
  return [...new Set([...committed, ...working, ...untracked])];
}

function main(argv) {
  const list = argv.includes('--list');
  const everything = argv.includes('--all');
  const baseAt = argv.indexOf('--base');
  const base = baseAt >= 0 ? argv[baseAt + 1] : 'origin/main';
  const files = everything ? [] : changedFiles(base);
  const pick = everything ? { all: true, because: '--all', specs: new Map(), unknown: [] } : specsFor(files);
  const existing = new Set(readdirSync('tests/browser').filter(f => f.endsWith('.spec.ts')).map(f => f.replace('.spec.ts', '')));
  const names = [...pick.specs.keys()].filter(n => existing.has(n));

  if (pick.all) console.log(`Whole suite (${existing.size} spec files): ${pick.because} affects everything.`);
  else if (names.length === 0) console.log('No browser specs needed: nothing that reaches the browser changed.');
  else {
    console.log(`${names.length} of ${existing.size} spec files for ${files.length} changed files:`);
    for (const n of names) console.log(`  ${n}  (${pick.specs.get(n)})`);
  }
  if (list || (!pick.all && names.length === 0)) return 0;

  const config = process.env.PW_CONFIG ?? (existsSync('playwright.local.config.ts') ? 'playwright.local.config.ts' : 'playwright.config.ts');
  const args = ['playwright', 'test', '-c', config, '--trace', 'off', '--reporter=line', ...(pick.all ? [] : names.map(n => `tests/browser/${n}.spec.ts`))];
  return spawnSync('npx', args, { stdio: 'inherit' }).status ?? 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(main(process.argv.slice(2)));
