import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").notNull().default("user"), // user, admin, super_admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const colorGroups = pgTable("color_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const colors = pgTable("colors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hexColor: text("hex_color").notNull(),
  groupId: integer("group_id").references(() => colorGroups.id),
  texture: text("texture"), // URL or path to texture image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  jobNumber: text("job_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, in_progress, paused, done
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  totalDuration: integer("total_duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cutlists = pgTable("cutlists", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  name: text("name").notNull(), // e.g., "Cutlist 1", "Cutlist 2"
  orderIndex: integer("order_index").notNull().default(0), // For ordering cutlists
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobMaterials = pgTable("job_materials", {
  id: serial("id").primaryKey(),
  cutlistId: integer("cutlist_id").references(() => cutlists.id),
  colorId: integer("color_id").references(() => colors.id).notNull(),
  totalSheets: integer("total_sheets").notNull(),
  completedSheets: integer("completed_sheets").notNull().default(0),
  sheetStatuses: text("sheet_statuses").array().default([]), // Array of 'cut', 'skip', 'pending'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobTimeLogs = pgTable("job_time_logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recutEntries = pgTable("recut_entries", {
  id: serial("id").primaryKey(),
  materialId: integer("material_id").references(() => jobMaterials.id).notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"), // Optional reason for the recut
  sheetStatuses: text("sheet_statuses").array().default([]), // Array of 'cut', 'skip', 'pending' for each recut sheet
  completedSheets: integer("completed_sheets").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
});

// Relations
export const jobsRelations = relations(jobs, ({ many }) => ({
  cutlists: many(cutlists),
  timeLogs: many(jobTimeLogs),
}));

export const cutlistsRelations = relations(cutlists, ({ one, many }) => ({
  job: one(jobs, {
    fields: [cutlists.jobId],
    references: [jobs.id],
  }),
  materials: many(jobMaterials),
}));

export const jobMaterialsRelations = relations(jobMaterials, ({ one, many }) => ({
  cutlist: one(cutlists, {
    fields: [jobMaterials.cutlistId],
    references: [cutlists.id],
  }),
  color: one(colors, {
    fields: [jobMaterials.colorId],
    references: [colors.id],
  }),
  recutEntries: many(recutEntries),
}));

export const colorsRelations = relations(colors, ({ one, many }) => ({
  group: one(colorGroups, {
    fields: [colors.groupId],
    references: [colorGroups.id],
  }),
  jobMaterials: many(jobMaterials),
}));

export const colorGroupsRelations = relations(colorGroups, ({ many }) => ({
  colors: many(colors),
}));

export const jobTimeLogsRelations = relations(jobTimeLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [jobTimeLogs.jobId],
    references: [jobs.id],
  }),
  user: one(users, {
    fields: [jobTimeLogs.userId],
    references: [users.id],
  }),
}));

export const recutEntriesRelations = relations(recutEntries, ({ one }) => ({
  material: one(jobMaterials, {
    fields: [recutEntries.materialId],
    references: [jobMaterials.id],
  }),
  user: one(users, {
    fields: [recutEntries.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertColorGroupSchema = createInsertSchema(colorGroups).omit({
  id: true,
  createdAt: true,
});

export const insertColorSchema = createInsertSchema(colors).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  jobNumber: true,
  createdAt: true,
  updatedAt: true,
  totalDuration: true,
});

export const insertCutlistSchema = createInsertSchema(cutlists).omit({
  id: true,
  createdAt: true,
});

export const insertJobMaterialSchema = createInsertSchema(jobMaterials).omit({
  id: true,
  createdAt: true,
  completedSheets: true,
  sheetStatuses: true,
});

export const insertRecutEntrySchema = createInsertSchema(recutEntries).omit({
  id: true,
  createdAt: true,
});

export const createJobSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  jobName: z.string().min(1, "Job name is required"),
  materials: z.array(z.object({
    colorId: z.number().min(1, "Color is required"),
    totalSheets: z.number().min(1, "Must have at least 1 sheet"),
  })).min(1, "At least one material is required"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ColorGroup = typeof colorGroups.$inferSelect;
export type InsertColorGroup = z.infer<typeof insertColorGroupSchema>;
export type Color = typeof colors.$inferSelect;
export type InsertColor = z.infer<typeof insertColorSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Cutlist = typeof cutlists.$inferSelect;
export type InsertCutlist = z.infer<typeof insertCutlistSchema>;
export type JobMaterial = typeof jobMaterials.$inferSelect;
export type InsertJobMaterial = z.infer<typeof insertJobMaterialSchema>;
export type JobTimeLog = typeof jobTimeLogs.$inferSelect;
export type RecutEntry = typeof recutEntries.$inferSelect;
export type InsertRecutEntry = z.infer<typeof insertRecutEntrySchema>;
export type CreateJob = z.infer<typeof createJobSchema>;
export type Login = z.infer<typeof loginSchema>;

// Enhanced types for frontend
export type CutlistWithMaterials = Cutlist & {
  materials: (JobMaterial & { color: Color })[];
};

export type JobWithCutlists = Job & {
  cutlists: CutlistWithMaterials[];
  timeLogs: JobTimeLog[];
};

// Keep backward compatibility - include timer logs
export type JobWithMaterials = Job & {
  cutlists: (typeof cutlists.$inferSelect & {
    materials: (typeof jobMaterials.$inferSelect & {
      color: typeof colors.$inferSelect;
      recutEntries: (typeof recutEntries.$inferSelect)[];
    })[];
  })[];
  jobTimeLogs: (typeof jobTimeLogs.$inferSelect)[];
};

export type ColorWithGroup = Color & {
  group: ColorGroup | null;
};
