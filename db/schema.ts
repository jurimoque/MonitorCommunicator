import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  roomId: serial("room_id").references(() => rooms.id),
  musician: text("musician").notNull(),
  instrument: text("instrument").notNull(),
  targetInstrument: text("target_instrument").notNull(),
  action: text("action").notNull(), // "volume_up", "volume_down", "reverb_up", "reverb_down"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completed: boolean("completed").default(false),
});

export type Room = typeof rooms.$inferSelect;
export type Request = typeof requests.$inferSelect;

export const insertRoomSchema = createInsertSchema(rooms);
export const selectRoomSchema = createSelectSchema(rooms);
export const insertRequestSchema = createInsertSchema(requests);
export const selectRequestSchema = createSelectSchema(requests);
