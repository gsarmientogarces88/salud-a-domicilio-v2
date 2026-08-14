export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'LABORATORY';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string | null;
};

export type DoctorProfile = {
  id: string;
  specialty: string;
  baseFee: number;
  isVerified: boolean;
  isAvailable: boolean;
  verificationStatus: 'INCOMPLETE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  coverageKm?: number | null;
  commune?: string | null;
  province?: string | null;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type ServiceRequest = {
  id: string;
  type: string;
  status: string;
  description: string;
  address: string;
  commune?: string | null;
  province?: string | null;
  city?: string | null;
  referencias?: string | null;
  telefono?: string | null;
  pacienteNombre?: string | null;
  edadPaciente?: number | null;
  totalAmount: number;
  doctorNetAmount?: number | null;
  commissionAmount?: number | null;
  createdAt: string;
  expiresAt?: string | null;
  remainingSeconds?: number | null;
  distanceKm?: number | null;
  requestLat?: number | null;
  requestLng?: number | null;
  scheduledAt?: string | null;
  startedAt?: string | null;
  patient?: { user: { firstName: string; lastName: string; phone?: string | null } };
};

export type ChatMessage = {
  id: string;
  senderType: 'DOCTOR' | 'PATIENT';
  senderUserId: string;
  message: string;
  createdAt: string;
};

export type AppointmentRequest = {
  id: string;
  status: string;
  commune?: string | null;
  city?: string | null;
  addressDisplay?: string | null;
  distanceKm?: string | null;
  lat?: number;
  lng?: number;
  createdAt: string;
  slot?: { startAt?: string; endAt?: string; date?: string };
  patient?: { user: { firstName: string; lastName: string } };
};

export type VerificationDoc = {
  id: string;
  type: string;
  originalName: string;
};

export type VerificationPayload = {
  verificationStatus: DoctorProfile['verificationStatus'];
  verificationNote?: string | null;
  isVerified: boolean;
  specialty: string;
  bankName?: string | null;
  bankAccountType?: string | null;
  bankAccountNumber?: string | null;
  documents: VerificationDoc[];
  requiredTypes: string[];
};
