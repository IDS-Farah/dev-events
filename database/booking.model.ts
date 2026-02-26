import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Import Event model directly (not via index.ts) to avoid circular dependencies.
import Event from "./event.model";

export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// RFC-5321-aligned regex for basic email format validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bookingSchema = new Schema<IBooking>(
  {
    // References the Event collection; indexed for fast lookup by event.
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => EMAIL_REGEX.test(v),
        message: (props: { value: string }) =>
          `"${props.value}" is not a valid email address.`,
      },
    },
  },
  { timestamps: true }
);

// Pre-save: ensure the referenced Event exists before persisting the booking.
bookingSchema.pre("save", async function () {
  const exists = await Event.exists({ _id: this.eventId });
  if (!exists) {
    throw new Error(`Referenced event with id "${this.eventId}" does not exist.`);
  }
});

// Guard against model re-registration during Next.js hot reloads.
const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking>) ||
  mongoose.model<IBooking>("Booking", bookingSchema);

export default Booking;
