import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const key = t.slice(0, idx);
    if (process.env[key]) continue;
    process.env[key] = t.slice(idx + 1).replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  const bcrypt = (await import("bcryptjs")).default;
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../lib/db");
  const { departments, officers, users } = await import("../lib/schema");

  console.log("Seeding…");

  const slug = "umass-amherst-pd";
  let [dept] = await db.select().from(departments).where(eq(departments.slug, slug));
  if (!dept) {
    [dept] = await db
      .insert(departments)
      .values({
        slug,
        name: "UMass Amherst Police Department",
        defaultCenterLng: -72.5267,
        defaultCenterLat: 42.3868,
        defaultZoom: 15,
      })
      .returning();
    console.log(`  + department ${dept.name}`);
  } else {
    console.log(`  = department ${dept.name} (exists)`);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@umasspd.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "patrolplan-dev";
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail));
  if (!existingUser) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      departmentId: dept.id,
      email: adminEmail,
      passwordHash,
      name: "UMass PD Admin",
      role: "admin",
    });
    console.log(`  + admin user ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`  = admin user ${adminEmail} (exists)`);
  }

  const sampleOfficers = [
    { badge: "1001", first: "Pat", last: "Reilly", rank: "Sergeant" },
    { badge: "1042", first: "Jordan", last: "Nguyen", rank: "Officer" },
    { badge: "1078", first: "Sam", last: "O'Connor", rank: "Officer" },
    { badge: "1112", first: "Riley", last: "Sullivan", rank: "Officer" },
    { badge: "1156", first: "Casey", last: "Martin", rank: "Officer" },
  ];
  for (const o of sampleOfficers) {
    const [exists] = await db
      .select()
      .from(officers)
      .where(eq(officers.badgeNumber, o.badge));
    if (exists) continue;
    await db.insert(officers).values({
      departmentId: dept.id,
      badgeNumber: o.badge,
      firstName: o.first,
      lastName: o.last,
      rank: o.rank,
    });
    console.log(`  + officer ${o.first} ${o.last} #${o.badge}`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
