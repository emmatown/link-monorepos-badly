import fs from "fs-extra";
import semver from "semver";
import chalk from "chalk";
import detectIndent from "detect-indent";
import path from "path";
import { Package } from "@manypkg/get-packages";
import { DEPENDENCY_TYPES } from "./constants";

function versionRangeToRangeType(versionRange: string): "^" | "~" | "" | null {
  if (versionRange.charAt(0) === "^") return "^";
  if (versionRange.charAt(0) === "~") return "~";
  if (semver.valid(versionRange) !== null) {
    return "";
  }
  return null;
}

export default async function upgrade(
  localPackages: Package[],
  foreignPackages: Package[]
) {
  let lastestDependencies = new Map<string, string>();
  for (let workspace of foreignPackages) {
    lastestDependencies.set(
      workspace.packageJson.name,
      workspace.packageJson.version
    );
  }
  for (const pkg of localPackages) {
    const newPkgJSON = { ...pkg.packageJson };

    for (let depType of DEPENDENCY_TYPES) {
      let deps = newPkgJSON[depType];
      if (deps !== undefined) {
        newPkgJSON[depType] = { ...deps };
        for (let depName in deps) {
          let depRange = deps[depName];
          let latestDependencyVersion = lastestDependencies.get(depName);
          // NOTE: we're even updating the range if the new version is in
          // i'm not 100% sure about this but it seems like the easiest way to
          // guarantee that the packages are updated
          if (latestDependencyVersion !== undefined) {
            const rangeType = versionRangeToRangeType(depRange);
            if (rangeType === null) {
              console.error(
                `⚠️ could not update ${chalk.green(depName)} in ${chalk.green(
                  pkg.packageJson.name
                )} because ${chalk.green(
                  pkg.packageJson.name
                )} depends on ${chalk.red(
                  depName + "@" + depRange
                )} in ${chalk.green(
                  depType
                )} and the range cannot be automatically updated, you should update this package manually`
              );
            } else {
              let newRange = rangeType + latestDependencyVersion;
              // @ts-ignore
              newPkgJSON[depType][depName] = newRange;
              console.log(
                `🎉 updated ${chalk.green(depName)} to ${chalk.green(
                  newRange
                )} in ${pkg.packageJson.name}`
              );
            }
          }
        }
      }
    }

    if (JSON.stringify(newPkgJSON) !== JSON.stringify(pkg.packageJson)) {
      const pkgDir = pkg.dir;
      const pkgJsonPath = path.join(pkgDir, "package.json");
      const pkgJsonRaw = await fs.readFile(pkgJsonPath, "utf-8");
      const indent = detectIndent(pkgJsonRaw).indent || "  ";

      let pkgJsonStr = JSON.stringify(newPkgJSON, null, indent);
      if (pkgJsonRaw.endsWith("\n")) {
        pkgJsonStr += "\n";
      }
      await fs.writeFile(pkgJsonPath, pkgJsonStr);
    }
  }
}
