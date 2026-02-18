export type UserRole = "participant" | "organizer" | "admin";

export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  capacity: number;
  status: "draft" | "published" | "closed";
}

export interface RegistrationEntity {
  id: string;
  eventId: string;
  userId: string;
  status: "registered" | "cancelled";
  paymentStatus: "mock_pending" | "mock_paid";
}

export interface EventAttendeeEntity {
  userId: string;
  fullName: string;
  username: string | null;
  telegramId: number | null;
  status: "registered" | "cancelled";
  paymentStatus: "mock_pending" | "mock_paid";
  registeredAt: string;
}

export interface RegisterForEventResult {
  status: "registered" | "waitlisted" | "already_registered" | "already_waitlisted";
  position?: number;
}

export interface CancelRegistrationResult {
  status: "cancelled" | "not_registered";
  promoted_user_id?: string | null;
}
