import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_COLOURS } from "../src/lib/constants";
import { londonDate, londonParts } from "../src/lib/time";
import { addLondonCalendarDays } from "../src/lib/scraper/fixtures";
import { frozenDiscoveryUrls } from "../src/lib/scraper/discovery-pack";

const prisma = new PrismaClient();

function at(daysFromToday: number, hour: number, minute = 0) {
  const p = londonParts(new Date());
  return addLondonCalendarDays(londonDate(p.year, p.month, p.day, hour, minute), daysFromToday);
}

async function main() {
  // Live boxes: refuse demo seed unless ALLOW_DEMO_SEED=1 (BOOTSTRAP alone is not enough).
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    console.error(
      "Refusing demo seed in production. Set ALLOW_DEMO_SEED=1 for a deliberate one-shot demo bootstrap, or create accounts in the Members UI."
    );
    process.exit(1);
  }

  const already = await prisma.user.findFirst({ where: { cellNumber: "07000000001" } });
  if (already) {
    console.log("Seed skipped: demo users already present.");
    if (process.env.SEED_UI_STRESS === "1") {
      await seedUiStress(prisma);
    }
    return;
  }

  const hash = (plain: string) => bcrypt.hash(plain, 12);

  const sparkbrook = await prisma.cell.create({
    data: { name: "Sparkbrook", region: "Birmingham", department: "Community", team: "South" }
  });
  const erdington = await prisma.cell.create({
    data: { name: "Erdington", region: "Birmingham", department: "Community", team: "North" }
  });

  const credentials = [
    { name: "Amara Adeyemi", cellNumber: "07000000001", password: "AdminPass1", role: "admin", cellId: null },
    { name: "Priya Nair", cellNumber: "07000000002", password: "LeaderPass1", role: "cell leader", cellId: sparkbrook.id },
    { name: "James Okafor", cellNumber: "07000000003", password: "LeaderPass2", role: "cell leader", cellId: erdington.id },
    { name: "Hannah Cole", cellNumber: "07000000004", password: "MemberPass1", role: "member", cellId: sparkbrook.id },
    { name: "Daniel Wright", cellNumber: "07000000005", password: "MemberPass2", role: "member", cellId: sparkbrook.id },
    { name: "Fatima Begum", cellNumber: "07000000006", password: "MemberPass3", role: "member", cellId: sparkbrook.id },
    { name: "Owen Reid", cellNumber: "07000000007", password: "MemberPass4", role: "member", cellId: erdington.id },
    { name: "Chloe Patel", cellNumber: "07000000008", password: "MemberPass5", role: "member", cellId: erdington.id }
  ];

  const users = [];
  for (const row of credentials) {
    users.push(
      await prisma.user.create({
        data: {
          name: row.name,
          cellNumber: row.cellNumber,
          passwordHash: await hash(row.password),
          role: row.role,
          cellId: row.cellId,
          active: true
        }
      })
    );
  }
  const admin = users[0];
  const leaderA = users[1];
  const hannah = users[3];
  const daniel = users[4];

  const cathedral = await prisma.organisation.create({
    data: { name: "St Philip’s Cathedral", nameKey: "st philip’s cathedral", status: "WHITELIST" }
  });
  const spam = await prisma.organisation.create({
    data: { name: "Spam Events Ltd", nameKey: "spam events ltd", status: "BLACKLIST" }
  });
  const tech = await prisma.organisation.create({
    data: { name: "Birmingham Tech Meetup", nameKey: "birmingham tech meetup", status: "STANDARD" }
  });

  await prisma.settings.create({
    data: {
      id: "default",
      locationLabel: "Birmingham",
      memberAttendeeView: "COUNT",
      categoryColours: JSON.stringify(DEFAULT_COLOURS),
      priorityUrls: JSON.stringify(frozenDiscoveryUrls())
    }
  });

  const published = await prisma.event.create({
    data: {
      title: "Sunday gathering at St Philip’s",
      organisationName: cathedral.name,
      organisationId: cathedral.id,
      category: "Christian",
      startsAt: at(2, 11, 0),
      endsAt: at(2, 12, 30),
      online: false,
      placeName: "St Philip’s Cathedral, Colmore Row",
      lat: 52.4814,
      lng: -1.8985,
      status: "PUBLISHED",
      capacity: 40,
      createdById: admin.id
    }
  });

  const fullEvent = await prisma.event.create({
    data: {
      title: "Jewellery Quarter founders’ breakfast",
      organisationName: "Impact Hub Birmingham",
      category: "Networking",
      startsAt: at(3, 8, 0),
      endsAt: at(3, 9, 30),
      online: false,
      placeName: "1000 Trades, Frederick Street",
      lat: 52.4865,
      lng: -1.9122,
      status: "PUBLISHED",
      capacity: 1,
      createdById: admin.id
    }
  });

  await prisma.booking.create({
    data: {
      eventId: fullEvent.id,
      userId: daniel.id,
      bookedById: leaderA.id,
      attendance: "UNCONFIRMED"
    }
  });

  await prisma.event.create({
    data: {
      title: "Birmingham Tech Meetup — lightning talks",
      organisationName: tech.name,
      organisationId: tech.id,
      sourceKey: "seed-tech-meetup-pending",
      category: "Meetup",
      startsAt: at(5, 18, 30),
      endsAt: at(5, 21, 0),
      online: false,
      placeName: "The Custard Factory, Digbeth",
      lat: 52.4747,
      lng: -1.8848,
      // Long Event Link so pending tiles exercise ellipsis (cathedral-shaped slug).
      externalUrl:
        "https://www.meetup.com/birmingham-tech-meetup/events/999999999/birmingham-tech-meetup-lightning-talks-extra-long-slug-for-pending-tile/",
      status: "PENDING",
      createdById: admin.id
    }
  });

  await prisma.event.create({
    data: {
      title: "Holy Communion in Traditional Language",
      organisationName: "www.birminghamcathedral.com",
      organisationId: cathedral.id,
      sourceKey: "seed-cathedral-pending-long-link",
      category: "Christian",
      startsAt: at(2, 13, 10),
      endsAt: at(2, 13, 40),
      online: false,
      placeName: "Birmingham Cathedral",
      lat: 52.4814,
      lng: -1.8985,
      externalUrl: "https://www.birminghamcathedral.com/event/holy-communion-in-traditional-language/2026-10-28/",
      status: "PENDING",
      createdById: admin.id
    }
  });

  await prisma.event.create({
    data: {
      title: "Unlimited crypto riches night",
      organisationName: spam.name,
      organisationId: spam.id,
      sourceKey: "seed-spam-crypto",
      category: "Networking",
      startsAt: at(4, 19, 0),
      endsAt: at(4, 22, 0),
      online: true,
      status: "DISCARDED"
    }
  });

  const seriesId = "seed-weekly-prayer";
  for (let i = 0; i < 12; i += 1) {
    const startsAt = at(1 + i * 7, 12, 30);
    await prisma.event.create({
      data: {
        seriesId,
        title: "Lunchtime prayer at Carrs Lane",
        organisationName: "Carrs Lane Church",
        category: "Christian",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        online: false,
        placeName: "Carrs Lane Church Centre",
        lat: 52.4795,
        lng: -1.8938,
        status: "PUBLISHED",
        recurrence: "WEEKLY",
        capacity: 20,
        createdById: leaderA.id
      }
    });
  }

  const past = await prisma.event.create({
    data: {
      title: "Open mic at BCU (last week)",
      organisationName: "Birmingham City University",
      category: "Student",
      startsAt: at(-5, 19, 0),
      endsAt: at(-5, 22, 0),
      online: false,
      placeName: "The Loft, BCU Students’ Union",
      lat: 52.4826,
      lng: -1.8854,
      status: "PUBLISHED",
      createdById: admin.id
    }
  });

  await prisma.booking.create({
    data: {
      eventId: past.id,
      userId: hannah.id,
      bookedById: hannah.id,
      attendance: "UNCONFIRMED"
    }
  });

  await prisma.booking.create({
    data: {
      eventId: published.id,
      userId: hannah.id,
      bookedById: hannah.id,
      attendance: "UNCONFIRMED"
    }
  });

  await prisma.event.create({
    data: {
      title: "IoD West Midlands lunch",
      organisationName: "IoD West Midlands",
      category: "Professional",
      startsAt: at(11, 12, 0),
      endsAt: at(11, 14, 30),
      online: false,
      placeName: "The Grand Hotel, Colmore Row",
      lat: 52.4818,
      lng: -1.9007,
      status: "PUBLISHED",
      capacity: 12,
      createdById: admin.id
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed",
      entityType: "System",
      summary: "Seeded Gather Birmingham with cells, users, and sample events"
    }
  });

  console.log("Seeded Gather — Birmingham Community Events");
  console.log("Sign in with cell number and password:");
  for (const row of credentials) {
    console.log(`  ${row.role.padEnd(12)}  ${row.cellNumber}  ${row.password}  (${row.name})`);
  }

  if (process.env.SEED_UI_STRESS === "1") {
    await seedUiStress(prisma);
  }
}

/** Worst-case UI fixtures for mobile / break-ui checks. Idempotent on sourceKey. */
async function seedUiStress(db: PrismaClient) {
  const admin = await db.user.findFirst({ where: { cellNumber: "07000000001" } });
  if (!admin) {
    console.log("SEED_UI_STRESS skipped: no admin user.");
    return;
  }

  const longTitle =
    "West Midlands inter-faith networking breakfast with unusually long title that must wrap on a candybar phone without blowing the layout";
  const longOrg = "Birmingham Metropolitan Borough Community Partnerships & Neighbourhood Outreach CIC";

  const existing = await db.event.findFirst({ where: { sourceKey: "seed-ui-stress-busy-day-00" } });
  if (existing) {
    console.log("SEED_UI_STRESS: stress events already present.");
    return;
  }

  // Twelve events on one busy day (day +4) — month agenda + home rows.
  for (let i = 0; i < 12; i += 1) {
    await db.event.create({
      data: {
        sourceKey: `seed-ui-stress-busy-day-${String(i).padStart(2, "0")}`,
        title: i === 0 ? longTitle : `Stress slot ${i + 1}: ${["Christian", "Meetup", "Networking", "Professional", "Student"][i % 5]} gathering`,
        organisationName: i === 0 ? longOrg : `Stress Org ${i + 1}`,
        category: ["Christian", "Meetup", "Networking", "Professional", "Student"][i % 5],
        startsAt: at(4, 8 + Math.floor(i / 2), i % 2 === 0 ? 0 : 30),
        endsAt: at(4, 9 + Math.floor(i / 2), i % 2 === 0 ? 0 : 30),
        online: i % 3 === 0,
        placeName: i % 3 === 0 ? null : "Digbeth, Birmingham, Birmingham, West Midlands, gb",
        lat: i % 3 === 0 ? null : 52.475 + i * 0.001,
        lng: i % 3 === 0 ? null : -1.885 - i * 0.001,
        status: "PUBLISHED",
        capacity: 40,
        createdById: admin.id
      }
    });
  }

  // One-event day and a pending tile with a brutal title.
  await db.event.create({
    data: {
      sourceKey: "seed-ui-stress-single-day",
      title: "Single quiet evening",
      organisationName: "Quiet Hall",
      category: "Meetup",
      startsAt: at(9, 19, 0),
      endsAt: at(9, 20, 30),
      online: false,
      placeName: "Moseley",
      lat: 52.446,
      lng: -1.888,
      status: "PUBLISHED",
      createdById: admin.id
    }
  });

  await db.event.create({
    data: {
      sourceKey: "seed-ui-stress-pending-long",
      title: longTitle,
      organisationName: longOrg,
      category: "Professional",
      startsAt: at(6, 12, 0),
      endsAt: at(6, 14, 0),
      online: false,
      placeName: "Colmore Row",
      lat: 52.481,
      lng: -1.9,
      externalUrl:
        "https://www.example.com/events/west-midlands-inter-faith-networking-breakfast-with-unusually-long-slug-for-pending-tile-ellipsis-check/",
      status: "PENDING",
      createdById: admin.id
    }
  });

  // Long member name for the members table (only if missing).
  const stressMember = await db.user.findFirst({ where: { cellNumber: "07000000099" } });
  if (!stressMember) {
    const cell = await db.cell.findFirst({ where: { name: "Sparkbrook" } });
    await db.user.create({
      data: {
        name: "Aleksandra Wiśniewska-Kowalczyk-Longname",
        cellNumber: "07000000099",
        passwordHash: await bcrypt.hash("StressPass1", 12),
        role: "member",
        cellId: cell?.id ?? null,
        active: true
      }
    });
  }

  console.log("SEED_UI_STRESS: added busy-day, single-day, pending, and long-name member fixtures.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
