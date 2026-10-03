export type Location = 'college' | 'station' | 'office';

export const LOCATION_LABELS: Record<Location, string> = {
  college: 'College',
  station: 'Station',
  office: 'Office',
};

export type Role = 'student' | 'employee' | 'rider';

export type RideStatus = 'REQUESTED' | 'ACCEPTED' | 'CLASHED' | 'IN_PROGRESS' | 'COMPLETED';

export type BoardingStatus = 'PENDING' | 'BOARDED' | 'MISSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Passenger {
  id: string;
  name: string;
  status: BoardingStatus;
}

export interface RideRequest {
  id: string;
  from: Location;
  to: Location;
  date: string;
  time: string;
  passengers: Passenger[];
  requestedBy: string;
  requestedByName: string;
  status: RideStatus;
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TimelineEvent {
  label: string;
  time: string;
  completed: boolean;
}
