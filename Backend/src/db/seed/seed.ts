import { db } from "../index";
import {
  users,
  tracks,
  seasons,
  memberships,
  sessions,
  sessionReviews,
  auditLogs,
} from "../schema";
import { config } from "../../config";
import { hashPassword } from "../../lib/auth";
import { eq } from "drizzle-orm";

export async function runSeed() {
  console.log("Starting GDGoC BUSB Database Seeding...");

  // 1. Seed Organizer User
  const organizerEmail = config.initialOrganizer.email.toLowerCase().trim();
  const [existingOrganizer] = await db
    .select()
    .from(users)
    .where(eq(users.email, organizerEmail))
    .limit(1);

  let organizerId: string;

  if (!existingOrganizer) {
    const passwordHash = await hashPassword(config.initialOrganizer.password);
    const [createdOrganizer] = await db
      .insert(users)
      .values({
        fullName: config.initialOrganizer.name,
        email: organizerEmail,
        passwordHash,
        role: "organizer",
        accountStatus: "approved",
      })
      .returning();
    organizerId = createdOrganizer.id;
    console.log(`Seeded Organizer user: ${organizerEmail}`);
  } else {
    organizerId = existingOrganizer.id;
    console.log(`Organizer user already exists: ${organizerEmail}`);
  }

  // 2. Seed Default Tracks
  const defaultTracks = [
    {
      name: "Front-End",
      description:
        "Modern web technologies, frontend frameworks, backend architecture, and APIs.",
    },
    {
      name: "Flutter",
      description:
        "Cross-platform mobile engineering with Flutter, Dart, and native Android.",
    },
    {
      name: "Artificial Intelligence",
      description:
        "Generative AI, machine learning foundations, TensorFlow, and Gemini APIs.",
    },
    {
      name: "Back-End",
      description: "Backend development using C# with ASP.NET Core.",
    },
    {
      name: "Cybersecurity",
      description:
        "Network security, ethical hacking, secure coding practices, and threat analysis.",
    },
    {
      name: "UI/UX Design",
      description:
        "User research, wireframing, high-fidelity Figma prototyping, and design systems.",
    },
    {
      name: "Revit",
      description:
        "Revit is a BIM (Building Information Modeling) software developed by Autodesk. It is widely used in the architecture, engineering, and construction (AEC) industries for designing, modeling, and documenting buildings and other structures.",
    },
    {
      name: "SolidWorks",
      description:
        "SolidWorks is a 3D CAD (Computer-Aided Design) software developed by Dassault Systèmes. It is widely used in the mechanical engineering, product design, and manufacturing industries for designing, modeling, and simulating mechanical parts and assemblies.",
    },
    {
      name: "Embedded Systems",
      description:
        "Embedded systems are computer systems that are designed to perform specific functions within a larger mechanical or electronic system. They are widely used in various applications, including automotive, aerospace, industrial automation, and consumer electronics.",
    },
  ];

  const trackMap = new Map<string, string>();

  for (const dt of defaultTracks) {
    const [existing] = await db
      .select()
      .from(tracks)
      .where(eq(tracks.name, dt.name))
      .limit(1);

    if (!existing) {
      const [newTrack] = await db
        .insert(tracks)
        .values({
          name: dt.name,
          description: dt.description,
          status: "active",
        })
        .returning();
      trackMap.set(dt.name, newTrack.id);
      console.log(`✅ Seeded Track: ${dt.name}`);
    } else {
      trackMap.set(dt.name, existing.id);
    }
  }

  // 3. Seed Default Season
  const seasonName = "2026–2027 Academic Season";
  const [existingSeason] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.name, seasonName))
    .limit(1);

  let seasonId: string;
  if (!existingSeason) {
    const now = new Date();
    const startsAt = new Date(now.getFullYear(), 8, 1); // Sept 1
    const endsAt = new Date(now.getFullYear() + 1, 5, 30); // June 30
    const [newSeason] = await db
      .insert(seasons)
      .values({
        name: seasonName,
        startsAt,
        endsAt,
        isActive: true,
        status: "active",
      })
      .returning();
    seasonId = newSeason.id;
    console.log(`✅ Seeded Season: ${seasonName}`);
  } else {
    seasonId = existingSeason.id;
  }

  // 4. Seed a Sample Approved Head (Web Dev) for immediate testing
  const sampleHeadEmail = "web.head@gdgoc-busb.org";
  const [existingHead] = await db
    .select()
    .from(users)
    .where(eq(users.email, sampleHeadEmail))
    .limit(1);

  let headId: string;
  const webTrackId = trackMap.get("Web Development");

  if (!existingHead && webTrackId) {
    const passHash = await hashPassword("HeadGDG2025!");
    const [createdHead] = await db
      .insert(users)
      .values({
        fullName: "Omar Tarek",
        email: sampleHeadEmail,
        passwordHash: passHash,
        role: "head",
        accountStatus: "approved",
      })
      .returning();
    headId = createdHead.id;

    // Membership
    await db.insert(memberships).values({
      userId: headId,
      trackId: webTrackId,
      role: "head",
      status: "approved",
      approvedBy: organizerId,
      approvedAt: new Date(),
    });
    console.log(`✅ Seeded Sample Track Head: ${sampleHeadEmail}`);

    // Seed sample approved session
    const [s1] = await db
      .insert(sessions)
      .values({
        trackId: webTrackId,
        seasonId,
        sessionNumber: 1,
        title: "Introduction to Modern React & Tailwind CSS",
        content:
          "Overview of component architecture, JSX syntax, state hooks, and setting up responsive styling with Tailwind CSS utility classes.",
        startsAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        endsAt: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
        mode: "offline",
        location: "Hall B - Engineering Building, Campus BUSB",
        attendanceCount: 45,
        notes:
          "Great interaction from 1st and 2nd year students. Hands-on coding completed successfully.",
        workflowStatus: "approved",
        createdBy: headId,
        submittedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
        reviewedBy: organizerId,
        reviewedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      })
      .returning();

    await db.insert(sessionReviews).values({
      sessionId: s1.id,
      reviewerId: organizerId,
      action: "approved",
      comment:
        "Excellent report with clear learning outcomes and accurate attendance count.",
    });

    // Seed sample submitted session awaiting review
    await db.insert(sessions).values({
      trackId: webTrackId,
      seasonId,
      sessionNumber: 2,
      title: "Fullstack APIs with Bun, Elysia, and PostgreSQL",
      content:
        "Building ultra-fast REST APIs with ElysiaJS, TypeScript type safety, connection pooling, and relational migrations with Drizzle ORM.",
      startsAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
      mode: "online",
      meetingUrl: "https://meet.google.com/busb-gdg-web",
      recordingUrl: "https://youtube.com/watch?v=sample-gdg-session-2",
      attendanceCount: 52,
      notes: "Recording shared with attendees on Discord.",
      workflowStatus: "submitted",
      createdBy: headId,
      submittedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    });

    console.log(
      "✅ Seeded Sample Web Development Sessions (Approved & Submitted)",
    );
  }

  // 5. Seed a Sample Pending Applicant for the Approval Queue
  const pendingApplicantEmail = "ai.applicant@busb.edu.eg";
  const [existingApplicant] = await db
    .select()
    .from(users)
    .where(eq(users.email, pendingApplicantEmail))
    .limit(1);

  const aiTrackId = trackMap.get("AI & Machine Learning");
  if (!existingApplicant && aiTrackId) {
    const passHash = await hashPassword("Applicant2025!");
    const [applicant] = await db
      .insert(users)
      .values({
        fullName: "Nour El-Din Hassan",
        email: pendingApplicantEmail,
        passwordHash: passHash,
        role: "head",
        accountStatus: "pending",
      })
      .returning();

    await db.insert(memberships).values({
      userId: applicant.id,
      trackId: aiTrackId,
      role: "head",
      status: "pending",
    });
    console.log(
      `✅ Seeded Pending Applicant for Approval Queue: ${pendingApplicantEmail}`,
    );
  }

  console.log("🎉 Seeding completed successfully!");
}

// Allow direct CLI execution: bun src/db/seed/seed.ts
if (import.meta.main) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
