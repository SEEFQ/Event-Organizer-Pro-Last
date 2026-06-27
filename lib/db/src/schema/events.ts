import { pgTable, serial, text, integer, timestamp, pgEnum, primaryKey, boolean, jsonb, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoryEnum = pgEnum("category", ["cycling", "hiking", "summer-night", "walking"]);
export const eventStatusEnum = pgEnum("event_status", ["upcoming", "ongoing", "completed", "cancelled"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "moderate", "challenging"]);
export const registrationStatusEnum = pgEnum("registration_status", ["pending", "confirmed", "waitlist", "cancelled"]);
export const activityTypeEnum = pgEnum("activity_type", ["registration", "comment", "event_created"]);
export const sponsorTypeEnum = pgEnum("sponsor_type", ["cafe", "restaurant", "camping", "hotel", "gym", "shop", "other"]);

// ─── Event Types master table ───────────────────────────────────────────────
export const eventTypesTable = pgTable("event_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Events ─────────────────────────────────────────────────────────────────
export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull(),
  eventTypeId: integer("event_type_id").references(() => eventTypesTable.id, { onDelete: "set null" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  status: eventStatusEnum("status").notNull().default("upcoming"),
  difficulty: difficultyEnum("difficulty"),
  distance: text("distance"),
  imageUrl: text("image_url"),
  meetingPoint: text("meeting_point"),
  guidelines: text("guidelines"),
  pointsValue: integer("points_value").notNull().default(1),
  registrationToken: text("registration_token").notNull().unique(),
  photoToken: text("photo_token").notNull().unique(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Registrations ──────────────────────────────────────────────────────────
export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fullNameAr: text("full_name_ar"),
  email: text("email").notNull(),
  phone: text("phone"),
  phoneCountryCode: text("phone_country_code").notNull().default("+962"),
  nationality: text("nationality"),
  nationalityOther: text("nationality_other"),
  hasMedicalConditions: boolean("has_medical_conditions").notNull().default(false),
  medicalDetails: text("medical_details"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  waiverAcceptedAt: timestamp("waiver_accepted_at", { withTimezone: true }),
  status: registrationStatusEnum("status").notNull().default("confirmed"),
  referralToken: text("referral_token").unique(),
  referredByRegistrationId: integer("referred_by_registration_id"),
  referralCount: integer("referral_count").notNull().default(0),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Participants ────────────────────────────────────────────────────────────
export const participantsTable = pgTable("participants", {
  id: serial("id").primaryKey(),
  phone: text("phone").unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  totalEvents: integer("total_events").notNull().default(0),
  referralCount: integer("referral_count").notNull().default(0),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  waiverAcceptedAt: timestamp("waiver_accepted_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Participant emails (multi-email support) ────────────────────────────────
export const participantEmailsTable = pgTable("participant_emails", {
  id: serial("id").primaryKey(),
  participantId: integer("participant_id").notNull().references(() => participantsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Comments ───────────────────────────────────────────────────────────────
export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Activity log ────────────────────────────────────────────────────────────
export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  eventTitle: text("event_title"),
  eventId: integer("event_id"),
  actorType: text("actor_type").notNull().default("system"),
  actorId: text("actor_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Photos ─────────────────────────────────────────────────────────────────
export const photosTable = pgTable("photos", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  uploaderName: text("uploader_name").notNull(),
  caption: text("caption"),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Sponsors ────────────────────────────────────────────────────────────────
export const sponsorsTable = pgTable("sponsors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: sponsorTypeEnum("type").notNull().default("other"),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  logoUrl: text("logo_url"),
  description: text("description"),
  discountCode: text("discount_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventSponsorsTable = pgTable("event_sponsors", {
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsorsTable.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.eventId, t.sponsorId] }),
]);

// pageType values: 'registration' | 'registration_submitted' | 'registration_approved' | 'photo'
export const sponsorImpressionsTable = pgTable("sponsor_impressions", {
  id: serial("id").primaryKey(),
  sponsorId: integer("sponsor_id").notNull().references(() => sponsorsTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  pageType: text("page_type").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Completed Events (admin-curated past events for registration page) ──────
export const completedEventsTable = pgTable("completed_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(),
  shortDescription: text("short_description").notNull(),
  coverImageUrl: text("cover_image_url"),
  eventDate: date("event_date"),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Media Banners ───────────────────────────────────────────────────────────
export const mediaBannersTable = pgTable("media_banners", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("image"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  title: text("title"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Event Financials ────────────────────────────────────────────────────────
export type DiscountEntry = { id: string; amount: number; reason: string; createdAt: string };

export const eventFinancialsTable = pgTable("event_financials", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().unique().references(() => eventsTable.id, { onDelete: "cascade" }),
  pricePerPerson: integer("price_per_person").notNull().default(0),
  totalCollected: integer("total_collected").notNull().default(0),
  referralDiscounts: integer("referral_discounts").notNull().default(0),
  manualDiscounts: integer("manual_discounts").notNull().default(0),
  promoDiscounts: integer("promo_discounts").notNull().default(0),
  discountEntries: jsonb("discount_entries").$type<DiscountEntry[]>(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Zod schemas ─────────────────────────────────────────────────────────────
export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, registeredAt: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });
export const insertPhotoSchema = createInsertSchema(photosTable).omit({ id: true, uploadedAt: true });
export const insertSponsorSchema = createInsertSchema(sponsorsTable).omit({ id: true, createdAt: true });
export const insertParticipantSchema = createInsertSchema(participantsTable).omit({ id: true, joinedAt: true });
export const insertEventTypeSchema = createInsertSchema(eventTypesTable).omit({ id: true, createdAt: true });
export const insertCompletedEventSchema = createInsertSchema(completedEventsTable).omit({ id: true, createdAt: true });
export const insertMediaBannerSchema = createInsertSchema(mediaBannersTable).omit({ id: true, createdAt: true });
export const insertEventFinancialsSchema = createInsertSchema(eventFinancialsTable).omit({ id: true, updatedAt: true });

// ─── Types ───────────────────────────────────────────────────────────────────
export type Event = typeof eventsTable.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Photo = typeof photosTable.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Participant = typeof participantsTable.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Sponsor = typeof sponsorsTable.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type EventType = typeof eventTypesTable.$inferSelect;
export type CompletedEvent = typeof completedEventsTable.$inferSelect;
export type MediaBanner = typeof mediaBannersTable.$inferSelect;
export type EventFinancials = typeof eventFinancialsTable.$inferSelect;
