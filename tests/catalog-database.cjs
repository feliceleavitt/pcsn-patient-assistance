const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
test("database publication is atomic, revisions immutable, browser roles excluded", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    await db.exec(
      fs.readFileSync("supabase/migrations/009_versioned_catalog.sql", "utf8"),
    );
    async function commit(expected, id, action) {
      return db.query("select pcsn_catalog_commit($1,$2,$3,$4,$5,$6)", [
        expected,
        id,
        JSON.stringify([{ id, name: id }]),
        action,
        "staff",
        "test revision",
      ]);
    }
    await commit(null, "v1", "publish");
    await commit("v1", "v2", "draft");
    const published = await db.query(
      "select pcsn_catalog_published() as catalog",
    );
    assert.equal(published.rows[0].catalog.version, "v1");
    await assert.rejects(commit("v1", "stale", "publish"), /Concurrent/);
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from pcsn_catalog_revisions where id='stale'",
        )
      ).rows[0].n,
      0,
    );
    await assert.rejects(
      db.exec("update pcsn_catalog_revisions set note='changed' where id='v1'"),
      /immutable/,
    );
    await assert.rejects(
      db.exec("delete from pcsn_catalog_revisions where id='v1'"),
      /immutable/,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from pcsn_catalog_revisions"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select pcsn_catalog_read()"),
        /permission denied/,
      );
      await assert.rejects(
        commit("v2", "attack", "publish"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await commit("v2", "v3", "publish");
    assert.equal(
      (await db.query("select pcsn_catalog_published() as catalog")).rows[0]
        .catalog.version,
      "v3",
    );
    assert.equal(
      (await db.query("select count(*)::int as n from pcsn_catalog_revisions"))
        .rows[0].n,
      3,
    );
  } finally {
    await db.close();
  }
});
