// Pure helpers of the release command: version math, bump suggestion, commit-subject check and
// the content-release decision. Nothing here touches git, the network or the filesystem.

export const commitPattern =
  /^(feat|fix|docs|test|chore|refactor|perf|build|ci|style|revert|merge)(\([a-z0-9-]+\))?!?: [a-z0-9][^.]*$/;

/** Same rule as `.husky/commit-msg`; merge, revert and fixup subjects pass untouched. */
export function isValidCommitSubject(subject) {
  if (/^(Merge |Revert |fixup! |squash! )/.test(subject)) return true;
  return commitPattern.test(subject);
}

export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Versão inválida: ${version}`);
  return match.slice(1).map(Number);
}

export function bumpVersion(version, bump) {
  const [major, minor, patch] = parseVersion(version);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Bump inválido: ${bump}`);
}

/**
 * `minor` for new functionality or content (feat, perf, or a breaking change while the app is
 * still 0.x); `patch` otherwise. Release and merge housekeeping commits do not count.
 */
export function suggestBump(subjects) {
  const relevant = subjects.filter(
    (subject) => !/^(chore\(release\)|chore\(content\)|Merge |merge)/.test(subject),
  );
  if (relevant.length === 0) return 'none';
  return relevant.some((subject) =>
    /^(feat|perf)(\([^)]*\))?!?:|^[a-z]+(\([^)]*\))?!:/.test(subject),
  )
    ? 'minor'
    : 'patch';
}

/** The compiled release hash differing from the pinned one means new content must be published. */
export function contentDecision({ compiledRelease, pinnedRelease }) {
  if (!compiledRelease) throw new Error('Release compilado ausente: rode `npm run content:build`.');
  return compiledRelease === pinnedRelease ? 'unchanged' : 'publish';
}

/** Highest semantic tag among `vX.Y.Z` names, or null. */
export function latestTag(tags) {
  const versions = tags
    .map((tag) => /^v(\d+\.\d+\.\d+)$/.exec(tag)?.[1])
    .filter(Boolean)
    .sort((a, b) => {
      const [x, y] = [parseVersion(a), parseVersion(b)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
  return versions.length ? `v${versions.at(-1)}` : null;
}

export const releaseBranches = ['master', 'main'];
export const prepareBranches = ['develop'];

/** Which phase the current branch runs: prepare on develop, tag on master, refuse elsewhere. */
export function phaseForBranch(branch) {
  if (releaseBranches.includes(branch)) return 'tag';
  if (prepareBranches.includes(branch) || /^(release|chore|feat|fix)\//.test(branch))
    return 'prepare';
  return 'unsupported';
}
