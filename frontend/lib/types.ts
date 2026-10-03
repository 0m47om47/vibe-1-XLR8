/**
 * Shapes returned by the backend API (see backend/src/models/*.ts).
 * Dates are ISO-8601 UTC strings; format them for display with lib/utils.
 */

export const LOCATIONS = ['College', 'Station', 'Office'] as const;
export type Location = (typeof LOCATIONS)[number];

export type Role = 'STUDENT' | 'EMPLOYEE' | 'RIDER' | 'ADMIN';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLASHED' | 'CANCELLED';
export type TripStatus = 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type BoardingStatus = 'PENDING' | 'BOARDED' | 'MISSED';
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';
export type RoleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface RoleRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: Role;
  requestedRole: Role;
  reason: string | null;
  status: RoleRequestStatus;
  reviewedBy: string | null;
  reviewerName: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardingSummary {
  total: number;
  boarded: number;
  missed: number;
  pending: number;
}

export interface RideRequest {
  id: string;
  requester: { id: string; name: string; role: Role };
  from: Location;
  to: Location;
  scheduledAt: string;
  endsAt: string;
  estimatedDurationMinutes: number;
  passengers: { id: string; name: string }[];
  passengerCount: number;
  status: RequestStatus;
  tripId: string | null;
  tripStatus: TripStatus | null;
  clashedWithTripId: string | null;
  statusReason: string | null;
  isPast: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripPassenger {
  id: string;
  name: string;
  boardingStatus: BoardingStatus;
  boardedAt: string | null;
  statusUpdatedAt: string | null;
}

export interface Trip {
  id: string;
  requestId: string;
  requester: { id: string; name: string };
  rider: { id: string; name: string };
  from: Location;
  to: Location;
  scheduledAt: string;
  endsAt: string;
  estimatedDurationMinutes: number;
  passengers: TripPassenger[];
  boarding: BoardingSummary;
  status: TripStatus;
  canStart: boolean;
  canComplete: boolean;
  acceptedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'ON_TRIP';
  currentTripId: string | null;
}

export interface PersonHistoryEntry {
  tripId: string;
  requestId: string;
  passengerId: string;
  passengerName: string;
  from: Location;
  to: Location;
  scheduledAt: string;
  boardingStatus: BoardingStatus;
  boardedAt: string | null;
  tripStatus: TripStatus;
  completedAt: string | null;
  riderName: string;
  requesterName: string;
}

export interface PersonHistory {
  person: string;
  summary: BoardingSummary;
  entries: PersonHistoryEntry[];
}

export interface RiderHistoryEntry {
  tripId: string;
  requestId: string;
  from: Location;
  to: Location;
  scheduledAt: string;
  status: TripStatus;
  requesterName: string;
  passengers: { id: string; name: string; boardingStatus: BoardingStatus }[];
  boarding: BoardingSummary;
  startedAt: string | null;
  completedAt: string | null;
}

export interface RiderHistory {
  totals: { trips: number; completed: number; passengers: number; boarded: number; missed: number };
  entries: RiderHistoryEntry[];
}

export interface PassengerDashboard {
  role: 'STUDENT' | 'EMPLOYEE';
  upcomingRide: { request: RideRequest; trip: Trip | null } | null;
  counts: Record<RequestStatus, number>;
  pendingRequests: RideRequest[];
  acceptedRequests: RideRequest[];
  recentHistory: PersonHistoryEntry[];
}

export interface RiderDashboard {
  role: 'RIDER';
  vehicle: Vehicle;
  currentTrip: Trip | null;
  nextTrip: Trip | null;
  pendingRequests: RideRequest[];
  pendingCount: number;
  upcomingTrips: Trip[];
  today: { completedTrips: number; passengersBoarded: number; passengersMissed: number };
  completedTotal: number;
}

export interface Meta {
  locations: Location[];
  tripDurationMinutes: number;
  maxPassengers: number;
  maxBookingDaysAhead: number;
}

export interface TimelineEvent {
  label: string;
  time: string;
  completed: boolean;
}
