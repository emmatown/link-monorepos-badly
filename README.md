# link-monorepos-badly

> Link packages from one Yarn Workspaces or Bolt monorepo to another ... sorta badly.

If you're using Yarn Workspaces:

```bash
# in the monorepo, you want to link to
yarn add link-monorepos-badly
yarn link-monorepos-badly link ../the/other-monorepo

# when you want to unlink
yarn link-monorepos-badly unlink ../the/other-monorepo
yarn
```

If you're using Bolt:

```bash
# in the monorepo, you want to link to
bolt add link-monorepos-badly
bolt link-monorepos-badly link ../the/other-monorepo

# when you want to unlink
bolt link-monorepos-badly unlink ../the/other-monorepo
bolt
```

## What do you mean by badly?

It's quite likely that there will be duplicated dependencies which will especially cause problems with peerDependencies.
