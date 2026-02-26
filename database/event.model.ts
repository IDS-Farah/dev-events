import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    // Slug is derived from title via pre-save hook; unique index enforced below.
    slug: { type: String, unique: true },
    description: { type: String, required: true, trim: true },
    overview: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    // Stored as YYYY-MM-DD after normalization in the pre-save hook.
    date: { type: String, required: true },
    // Stored as HH:MM (24-hour) after normalization in the pre-save hook.
    time: { type: String, required: true },
    mode: { type: String, required: true, trim: true },
    audience: { type: String, required: true, trim: true },
    agenda: { type: [String], required: true },
    organizer: { type: String, required: true, trim: true },
    tags: { type: [String], required: true },
  },
  { timestamps: true }
);

// Async pre-save hook: throw to abort (Mongoose 9 async hook pattern).
eventSchema.pre("save", async function () {
  // Regenerate slug only when the document is new or the title has changed.
  if (this.isNew || this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // strip non-alphanumeric chars
      .trim()
      .replace(/\s+/g, "-"); // collapse whitespace into hyphens
  }

  // Validate and normalise date to ISO calendar format: YYYY-MM-DD.
  const parsed = new Date(this.date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: "${this.date}"`);
  }
  this.date = parsed.toISOString().split("T")[0];

  // Normalise time to HH:MM (24-hour). Accepts "HH:MM", "H:MM", and 12-hour "H:MM AM/PM".
  const timeMatch = this.time
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!timeMatch) {
    throw new Error(
      `Invalid time format: "${this.time}". Expected HH:MM or HH:MM AM/PM.`
    );
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3]?.toUpperCase();

  // Convert 12-hour clock to 24-hour clock when a meridiem designator is present.
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  if (hours > 23 || parseInt(minutes, 10) > 59) {
    throw new Error(`Time out of range: "${this.time}".`);
  }

  this.time = `${String(hours).padStart(2, "0")}:${minutes}`;
});

// Guard against model re-registration during Next.js hot reloads.
const Event: Model<IEvent> =
  (mongoose.models.Event as Model<IEvent>) ||
  mongoose.model<IEvent>("Event", eventSchema);

export default Event;
