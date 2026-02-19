export type UserRole = "participant" | "organizer" | "admin";

export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  capacity: number;
  status: "draft" | "published" | "closed";
}

export interface EventRegistrationQuestion {
  id: string;
  eventId: string;
  version: number;
  prompt: string;
  isRequired: boolean;
  position: number;
  isActive: boolean;
}

export interface RegistrationQuestionAnswer {
  questionId: string;
  questionVersion: number;
  answerText: string | null;
  isSkipped: boolean;
}

export interface AttendeeQuestionAnswerView {
  questionId: string;
  questionVersion: number;
  prompt: string;
  answerText: string | null;
  isSkipped: boolean;
  createdAt: string;
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
  checkedIn: boolean;
  answers: AttendeeQuestionAnswerView[];
}

export interface WaitlistEntryEntity {
  userId: string;
  fullName: string;
  username: string | null;
  telegramId: number | null;
  position: number;
  createdAt: string;
}

export interface EventStatsEntity {
  eventId: string;
  registeredCount: number;
  checkedInCount: number;
  waitlistCount: number;
  noShowRate: number;
}

export interface RegisterForEventResult {
  status: "registered" | "waitlisted" | "already_registered" | "already_waitlisted";
  position?: number;
}

export interface CancelRegistrationResult {
  status: "cancelled" | "not_registered";
  promoted_user_id?: string | null;
}
