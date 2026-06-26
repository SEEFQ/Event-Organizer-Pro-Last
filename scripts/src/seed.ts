import {
  db,
  eventsTable,
  sponsorsTable,
  eventSponsorsTable,
  registrationsTable,
  participantsTable,
  activityLogTable,
  commentsTable,
} from "@workspace/db";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Sponsors ──────────────────────────────────────────────────────────────
  console.log("Creating sponsors...");
  const [summit, trailbase, peakfit] = await db
    .insert(sponsorsTable)
    .values([
      {
        name: "Summit Café",
        type: "cafe",
        website: "https://summitcafe.example.com",
        instagram: "@summitcafe",
        description: "Specialty coffee and trail snacks at the trailhead. Fuel up before and refuel after.",
        discountCode: "SUMMIT15",
      },
      {
        name: "TrailBase Camp",
        type: "camping",
        website: "https://trailbase.example.com",
        instagram: "@trailbasecamp",
        facebook: "trailbasecamp",
        description: "Outdoor gear, tents, and everything you need for the trail. 10% off for all club members.",
        discountCode: "TRAIL10",
      },
      {
        name: "Peak Fitness Studio",
        type: "gym",
        website: "https://peakfit.example.com",
        instagram: "@peakfitstudio",
        description: "Train smarter. Strength and conditioning classes tailored for outdoor athletes.",
        discountCode: "PEAK20",
      },
      {
        name: "The Hiker's Kitchen",
        type: "restaurant",
        website: "https://hikerskitchen.example.com",
        description: "Post-hike comfort food with massive portions. Proudly supports the local outdoor community.",
      },
    ])
    .returning();

  // ── Events ────────────────────────────────────────────────────────────────
  console.log("Creating events...");
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  const [cycling, hiking, summerNight, walking, pastHike] = await db
    .insert(eventsTable)
    .values([
      {
        title: "Morning Coastal Cycling Ride",
        description: "A refreshing 30km coastal road ride along the shoreline. Suitable for all road cyclists. We'll stop halfway for a group photo and coffee break at Summit Café before the return leg.\n\nPlease bring:\n• Road or hybrid bike (in good condition)\n• Helmet (mandatory)\n• Water bottle and a snack\n• Small first-aid kit",
        category: "cycling",
        date: inDays(7),
        location: "Coastal Highway Trailhead, Harbor District",
        capacity: 20,
        status: "upcoming",
        difficulty: "moderate",
        distance: "30 km",
        meetingPoint: "Harbor District Parking Lot A, next to the blue info board",
        guidelines: "• Arrive 15 minutes early for a safety briefing\n• Ride in single file on roads\n• No headphones while cycling\n• Signal turns and stops to the group",
        pointsValue: 3,
        registrationToken: randomUUID(),
        photoToken: randomUUID(),
      },
      {
        title: "Valley Ridge Hiking Day",
        description: "A full-day hike through Valley Ridge — one of the most scenic trails in the region. We'll summit at around noon and break for lunch before descending on the west trail.\n\nExpect stunning panoramic views, some rocky terrain, and good company.",
        category: "hiking",
        date: inDays(14),
        location: "Valley Ridge Nature Reserve, North Gate",
        capacity: 15,
        status: "upcoming",
        difficulty: "challenging",
        distance: "18 km",
        meetingPoint: "North Gate car park — meet at the ranger station",
        guidelines: "• Sturdy hiking boots required\n• Bring at least 2L of water\n• Pack lunch and snacks for the day\n• Walking poles recommended\n• Leave no trace",
        pointsValue: 5,
        registrationToken: randomUUID(),
        photoToken: randomUUID(),
      },
      {
        title: "Sunset Summer Night Walk",
        description: "Join us for a magical evening stroll through the botanical gardens, finishing with a stargazing session on the hilltop lawn. Bring a blanket and a friend!",
        category: "summer-night",
        date: inDays(21),
        location: "Botanical Gardens, East Entrance",
        capacity: 40,
        status: "upcoming",
        difficulty: "easy",
        distance: "5 km",
        meetingPoint: "East Entrance fountain — under the big oak tree",
        guidelines: "• Comfortable walking shoes\n• Bring a light jacket for the evening\n• Torch or phone torch recommended after dark\n• No bright lights during stargazing",
        pointsValue: 2,
        registrationToken: randomUUID(),
        photoToken: randomUUID(),
      },
      {
        title: "Old Town Heritage Walking Tour",
        description: "Explore 400 years of history on foot. Our guided walking tour winds through the old town's cobbled streets, historic squares, and hidden courtyards. Perfect for history lovers and newcomers alike.",
        category: "walking",
        date: inDays(5),
        location: "Old Town Square, Central District",
        capacity: 25,
        status: "upcoming",
        difficulty: "easy",
        distance: "6 km",
        meetingPoint: "Old Town Square — meet by the clock tower at the main entrance",
        guidelines: "• Comfortable walking shoes\n• Camera recommended\n• Tour will proceed rain or shine — bring an umbrella just in case",
        pointsValue: 2,
        registrationToken: randomUUID(),
        photoToken: randomUUID(),
      },
      {
        title: "Forest Trail Morning Hike",
        description: "An early morning hike through the old-growth forest reserve. We tracked wildlife and enjoyed the fresh morning air. Great turnout — thanks everyone!",
        category: "hiking",
        date: daysAgo(14),
        location: "Green Forest Reserve, West Trail",
        capacity: 18,
        status: "completed",
        difficulty: "moderate",
        distance: "12 km",
        meetingPoint: "West Trail car park, Gate 2",
        guidelines: "• Hiking boots required\n• Bring water and snacks\n• No pets allowed in the reserve",
        pointsValue: 3,
        registrationToken: randomUUID(),
        photoToken: randomUUID(),
      },
    ])
    .returning();

  // ── Link sponsors to events ───────────────────────────────────────────────
  console.log("Linking sponsors to events...");
  await db.insert(eventSponsorsTable).values([
    { eventId: cycling.id, sponsorId: summit.id },
    { eventId: cycling.id, sponsorId: peakfit.id },
    { eventId: hiking.id, sponsorId: trailbase.id },
    { eventId: hiking.id, sponsorId: summit.id },
    { eventId: summerNight.id, sponsorId: peakfit.id },
    { eventId: walking.id, sponsorId: summit.id },
    { eventId: pastHike.id, sponsorId: trailbase.id },
  ]);

  // ── Participants & Registrations ──────────────────────────────────────────
  console.log("Creating registrations and participants...");

  const people = [
    { name: "Sarah Chen", email: "sarah.chen@example.com", phone: "+1-555-0101" },
    { name: "Marco Rivera", email: "marco.rivera@example.com", phone: "+1-555-0102" },
    { name: "Aisha Okonkwo", email: "aisha.okonkwo@example.com", phone: "+1-555-0103" },
    { name: "Luca Bianchi", email: "luca.bianchi@example.com", phone: "+1-555-0104" },
    { name: "Priya Nair", email: "priya.nair@example.com", phone: "+1-555-0105" },
    { name: "Tom Halvorsen", email: "tom.halvorsen@example.com", phone: "+1-555-0106" },
  ];

  // Event registrations: [eventId, personIndex, status]
  const regs: Array<{ event: typeof cycling; person: (typeof people)[0]; status: "confirmed" | "waitlist" }> = [
    // Past hike — all confirmed
    { event: pastHike, person: people[0], status: "confirmed" },
    { event: pastHike, person: people[1], status: "confirmed" },
    { event: pastHike, person: people[2], status: "confirmed" },
    { event: pastHike, person: people[3], status: "confirmed" },
    // Cycling ride
    { event: cycling, person: people[0], status: "confirmed" },
    { event: cycling, person: people[2], status: "confirmed" },
    { event: cycling, person: people[4], status: "confirmed" },
    { event: cycling, person: people[5], status: "confirmed" },
    // Valley Ridge hike
    { event: hiking, person: people[1], status: "confirmed" },
    { event: hiking, person: people[2], status: "confirmed" },
    { event: hiking, person: people[3], status: "confirmed" },
    { event: hiking, person: people[5], status: "confirmed" },
    // Summer night walk
    { event: summerNight, person: people[0], status: "confirmed" },
    { event: summerNight, person: people[1], status: "confirmed" },
    { event: summerNight, person: people[4], status: "confirmed" },
    // Heritage walking tour
    { event: walking, person: people[2], status: "confirmed" },
    { event: walking, person: people[3], status: "confirmed" },
    { event: walking, person: people[5], status: "confirmed" },
  ];

  const insertedRegs = await db
    .insert(registrationsTable)
    .values(
      regs.map((r) => ({
        eventId: r.event.id,
        name: r.person.name,
        email: r.person.email,
        phone: r.person.phone,
        status: r.status,
        referralToken: randomUUID(),
      }))
    )
    .returning();

  // ── Build participant records from registrations ───────────────────────────
  const pointsMap: Record<string, { name: string; points: number; events: number }> = {};
  for (const reg of insertedRegs) {
    const regDef = regs.find((r) => r.person.email === reg.email && r.event.id === reg.eventId);
    if (!regDef || reg.status !== "confirmed") continue;
    const pts = regDef.event.pointsValue ?? 1;
    if (!pointsMap[reg.email]) {
      pointsMap[reg.email] = { name: reg.name, points: 0, events: 0 };
    }
    pointsMap[reg.email].points += pts;
    pointsMap[reg.email].events += 1;
  }

  await db.insert(participantsTable).values(
    Object.entries(pointsMap).map(([email, data]) => ({
      email,
      name: data.name,
      totalPoints: data.points,
      totalEvents: data.events,
      referralCount: 0,
    }))
  );

  // ── Comments ──────────────────────────────────────────────────────────────
  console.log("Adding comments...");
  await db.insert(commentsTable).values([
    {
      eventId: cycling.id,
      authorName: "Sarah Chen",
      content: "Looking forward to this! Is there a pace requirement or can we go at our own speed?",
    },
    {
      eventId: cycling.id,
      authorName: "Marco Rivera",
      content: "Will there be a support vehicle for the ride, or are we fully self-supported?",
    },
    {
      eventId: hiking.id,
      authorName: "Aisha Okonkwo",
      content: "This trail is stunning — did it last summer solo. Can't wait to share it with the group!",
    },
    {
      eventId: hiking.id,
      authorName: "Luca Bianchi",
      content: "Is there mobile signal on the trail, or should we download offline maps beforehand?",
    },
    {
      eventId: summerNight.id,
      authorName: "Priya Nair",
      content: "Do we need to bring telescopes or binoculars for the stargazing part?",
    },
    {
      eventId: walking.id,
      authorName: "Tom Halvorsen",
      content: "Will the tour be in English only, or multilingual?",
    },
  ]);

  // ── Activity log ──────────────────────────────────────────────────────────
  console.log("Adding activity log entries...");
  await db.insert(activityLogTable).values([
    {
      type: "event_created",
      description: `Event "${cycling.title}" was created`,
      eventTitle: cycling.title,
      eventId: cycling.id,
    },
    {
      type: "event_created",
      description: `Event "${hiking.title}" was created`,
      eventTitle: hiking.title,
      eventId: hiking.id,
    },
    {
      type: "event_created",
      description: `Event "${summerNight.title}" was created`,
      eventTitle: summerNight.title,
      eventId: summerNight.id,
    },
    {
      type: "event_created",
      description: `Event "${walking.title}" was created`,
      eventTitle: walking.title,
      eventId: walking.id,
    },
    {
      type: "registration",
      description: `Sarah Chen registered for "${cycling.title}"`,
      eventTitle: cycling.title,
      eventId: cycling.id,
    },
    {
      type: "registration",
      description: `Aisha Okonkwo registered for "${hiking.title}"`,
      eventTitle: hiking.title,
      eventId: hiking.id,
    },
    {
      type: "registration",
      description: `Marco Rivera registered for "${hiking.title}"`,
      eventTitle: hiking.title,
      eventId: hiking.id,
    },
  ]);

  console.log("✅ Seed complete!");
  console.log(`   Events: 5`);
  console.log(`   Sponsors: 4`);
  console.log(`   Registrations: ${insertedRegs.length}`);
  console.log(`   Participants: ${Object.keys(pointsMap).length}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
