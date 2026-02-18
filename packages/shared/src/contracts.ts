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
