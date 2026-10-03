'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Role, RideRequest, BoardingStatus, RideStatus } from './types';
import { USERS, INITIAL_RIDE_REQUESTS, PAST_TRIPS } from './mock-data';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface DemoState {
  // Auth
  currentRole: Role;
  currentUserId: string;
  isLoggedIn: boolean;

  // Rides
  rideRequests: RideRequest[];
  pastTrips: RideRequest[];

  // Rider state
  activeTrip: string | null; // ride request ID
  totoStatus: 'available' | 'on_trip';

  // Toasts
  toasts: Toast[];

  // Actions
  setRole: (role: Role) => void;
  login: (role: Role) => void;
  logout: () => void;
  createRideRequest: (request: Omit<RideRequest, 'id' | 'status' | 'createdAt'>) => void;
  acceptRide: (rideId: string) => void;
  startTrip: (rideId: string) => void;
  updatePassengerStatus: (rideId: string, passengerId: string, status: BoardingStatus) => void;
  completeTrip: (rideId: string) => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  getPersonTrips: (personName: string) => RideRequest[];
  getRiderTrips: () => RideRequest[];
  getUpcomingRide: (personName: string) => RideRequest | undefined;
}

const DemoContext = createContext<DemoState | undefined>(undefined);

let toastId = 0;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>('student');
  const [currentUserId, setCurrentUserId] = useState('om');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([...INITIAL_RIDE_REQUESTS]);
  const [pastTrips, setPastTrips] = useState<RideRequest[]>([...PAST_TRIPS]);
  const [activeTrip, setActiveTrip] = useState<string | null>(null);
  const [totoStatus, setTotoStatus] = useState<'available' | 'on_trip'>('available');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${++toastId}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setRole = useCallback((role: Role) => {
    setCurrentRole(role);
    if (role === 'student') setCurrentUserId('om');
    else if (role === 'employee') setCurrentUserId('rahul');
    else setCurrentUserId('raj');
  }, []);

  const login = useCallback((role: Role) => {
    setRole(role);
    setIsLoggedIn(true);
  }, [setRole]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
  }, []);

  const createRideRequest = useCallback(
    (request: Omit<RideRequest, 'id' | 'status' | 'createdAt'>) => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      const createdAt = `${h}:${String(mins).padStart(2, '0')} ${ampm}`;

      let idNum = 1027;
      const allIds = [...rideRequests, ...pastTrips].map((r) =>
        parseInt(r.id.replace('TOTO-', ''))
      );
      if (allIds.length > 0) {
        idNum = Math.max(...allIds) + 1;
      }

      const newRequest: RideRequest = {
        ...request,
        id: `TOTO-${idNum}`,
        status: 'REQUESTED',
        createdAt,
      };
      setRideRequests((prev) => [newRequest, ...prev]);
      addToast('success', 'Ride request created');
    },
    [rideRequests, pastTrips, addToast]
  );

  const acceptRide = useCallback(
    (rideId: string) => {
      setRideRequests((prev) => {
        const ride = prev.find((r) => r.id === rideId);
        if (!ride) return prev;

        let clashedCount = 0;
        const updated = prev.map((r) => {
          if (r.id === rideId) {
            return { ...r, status: 'ACCEPTED' as RideStatus, acceptedAt: formatNow() };
          }
          // Clash same-time requests that are still REQUESTED
          if (r.time === ride.time && r.date === ride.date && r.status === 'REQUESTED') {
            clashedCount++;
            return { ...r, status: 'CLASHED' as RideStatus };
          }
          return r;
        });

        if (clashedCount > 0) {
          setTimeout(() => {
            addToast(
              'warning',
              `Ride accepted. ${clashedCount} other ${ride.time} request${clashedCount > 1 ? 's were' : ' was'} marked as clashed.`
            );
          }, 100);
        } else {
          setTimeout(() => addToast('success', 'Ride accepted'), 100);
        }

        return updated;
      });
    },
    [addToast]
  );

  const startTrip = useCallback(
    (rideId: string) => {
      setRideRequests((prev) =>
        prev.map((r) =>
          r.id === rideId
            ? { ...r, status: 'IN_PROGRESS' as RideStatus, startedAt: formatNow() }
            : r
        )
      );
      setActiveTrip(rideId);
      setTotoStatus('on_trip');
    },
    []
  );

  const updatePassengerStatus = useCallback(
    (rideId: string, passengerId: string, status: BoardingStatus) => {
      setRideRequests((prev) =>
        prev.map((r) => {
          if (r.id !== rideId) return r;
          return {
            ...r,
            passengers: r.passengers.map((p) =>
              p.id === passengerId ? { ...p, status } : p
            ),
          };
        })
      );
      if (status === 'BOARDED') {
        addToast('success', 'Passenger marked as boarded');
      } else if (status === 'MISSED') {
        addToast('error', 'Passenger marked as missed');
      }
    },
    [addToast]
  );

  const completeTrip = useCallback(
    (rideId: string) => {
      setRideRequests((prev) => {
        const ride = prev.find((r) => r.id === rideId);
        if (ride) {
          const completedRide: RideRequest = {
            ...ride,
            status: 'COMPLETED',
            completedAt: formatNow(),
          };
          setPastTrips((pastPrev) => [completedRide, ...pastPrev]);
        }
        return prev.map((r) =>
          r.id === rideId
            ? { ...r, status: 'COMPLETED' as RideStatus, completedAt: formatNow() }
            : r
        );
      });
      setActiveTrip(null);
      setTotoStatus('available');
      addToast('success', 'Trip completed');
    },
    [addToast]
  );

  const getPersonTrips = useCallback(
    (personName: string) => {
      const allTrips = [...rideRequests, ...pastTrips];
      return allTrips.filter(
        (r) =>
          r.status === 'COMPLETED' &&
          r.passengers.some((p) => p.name === personName)
      );
    },
    [rideRequests, pastTrips]
  );

  const getRiderTrips = useCallback(() => {
    const allTrips = [...rideRequests, ...pastTrips];
    return allTrips.filter((r) => r.status === 'COMPLETED');
  }, [rideRequests, pastTrips]);

  const getUpcomingRide = useCallback(
    (personName: string) => {
      return rideRequests.find(
        (r) =>
          (r.status === 'REQUESTED' || r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS') &&
          r.passengers.some((p) => p.name === personName)
      );
    },
    [rideRequests]
  );

  const currentUser = USERS[currentUserId];

  return (
    <DemoContext.Provider
      value={{
        currentRole,
        currentUserId,
        isLoggedIn,
        rideRequests,
        pastTrips,
        activeTrip,
        totoStatus,
        toasts,
        setRole,
        login,
        logout,
        createRideRequest,
        acceptRide,
        startTrip,
        updatePassengerStatus,
        completeTrip,
        addToast,
        removeToast,
        getPersonTrips,
        getRiderTrips,
        getUpcomingRide,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}

export function useCurrentUser() {
  const { currentUserId } = useDemo();
  return USERS[currentUserId];
}

function formatNow(): string {
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(mins).padStart(2, '0')} ${ampm}`;
}
