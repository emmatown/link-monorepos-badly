# link-monorepos-badly

> Link packages from one Yarn Workspaces or Bolt monorepo to another ... sorta badly.

## Getting started

Install `link-monorepos-badly` globally

```bash
yarn global add link-monorepos-badly
```

Run an install of the [foreign monorepo](#foreign-monorepo) and the [local monorepo](#local-monorepo)

```bash
cd /path/to/the/foreign/monorepo
# If the foreign monorepo is using Yarn Workspaces
yarn
# If the foreign monorepo is using Bolt
bolt
cd /path/to/the/local/monorepo
# If the local monorepo is using Yarn Workspaces
yarn
# If the local monorepo is using Bolt
bolt
```

Link the packages from the foreign monorepo to the local monorepo

```bash
cd /path/to/the/local/monorepo
link-monorepos-badly link /path/to/the/foreign/monorepo
```

When you're ready to unlink packages, you can unlink the packages and reinstall.

```bash
cd /path/to/the/local/monorepo
link-monorepos-badly unlink /path/to/the/foreign/monorepo
# If the local monorepo is using Yarn Workspaces
yarn
# If the local monorepo is using Bolt
bolt
```

Once you've published new versions of the packages from the foreign monorepo

## Terms

### local monorepo

The monorepo you're linking packages to (this should be at your current working directory)

### foreign monorepo

The monorepo you're linking packages from (this is the path you specify to `link-monorepos-badly`)

## Why is this linking monorepos _badly_?

It's quite likely that there will be duplicated dependencies which will especially cause problems with peerDependencies. We're not attempting to solve this problem well, this is a temporary solution to the problem of linking monorepos until the Node ecosystem is compatible with Yarn PnP and we can use it to link multiple monorepos together well.
