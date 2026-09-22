import fs from "node:fs/promises";
import path from "node:path";
import { seedState } from "./seed";
import { importWorkbook } from "./workbook";
import { commitRevision } from "./model";
export async function initialCatalog() {
  const state = seedState();
  const imported = await importWorkbook(
    await fs.readFile(
      path.join(
        process.cwd(),
        "public/templates/PCSN_Arizona_Financial_Assistance_Route_Catalog.xlsx",
      ),
    ),
  );
  return commitRevision(
    state,
    [...state.revisions[0].entries, ...imported.entries],
    state.head,
    "draft",
    "Workbook import",
    "Imported 74 routes and 16 question references from the supplied route catalog. Disabled and unverified; existing published release is unchanged.",
  );
}
