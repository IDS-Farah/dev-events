import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Import Event model directly (not via index.ts) to avoid circular dependencies.
import Event from "./event.model";
import { Schema, model, models, Document, Types } from 'mongoose';
import Event from './event.model';

// TypeScript interface for Booking document
export interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
    {
      eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event ID is required'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        validate: {
          validator: function (email: string) {
            // RFC 5322 compliant email validation regex
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            return emailRegex.test(email);
          },
          message: 'Please provide a valid email address',
        },
      },
    },
    {
      timestamps: true, // Auto-generate createdAt and updatedAt
    }
);

// Pre-save hook to validate events exists before creating booking
BookingSchema.pre('save', async function (next) {
  const booking = this as IBooking;

  // Only validate eventId if it's new or modified
  if (booking.isModified('eventId') || booking.isNew) {
    try {
      const eventExists = await Event.findById(booking.eventId).select('_id');

      if (!eventExists) {
        const error = new Error(`Event with ID ${booking.eventId} does not exist`);
        error.name = 'ValidationError';
        return next(error);
      }
    } catch {
      const validationError = new Error('Invalid events ID format or database error');
      validationError.name = 'ValidationError';
      return next(validationError);
    }
  }

  next();
});

// Create index on eventId for faster queries
BookingSchema.index({ eventId: 1 });

// Create compound index for common queries (events bookings by date)
BookingSchema.index({ eventId: 1, createdAt: -1 });

// Create index on email for user booking lookups
BookingSchema.index({ email: 1 });

// Enforce one booking per events per email
BookingSchema.index({ eventId: 1, email: 1 }, { unique: true, name: 'uniq_event_email' });
const Booking = models.Booking || model<IBooking>('Booking', BookingSchema);

export default Booking;
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
