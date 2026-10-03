'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo, useCurrentUser } from '@/lib/demo-state';
import { Location, Passenger } from '@/lib/types';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import Button from '@/components/ui/Button';
import RouteVisualization from '@/components/rides/RouteVisualization';
import { getLocationLabel, getInitials } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  MapPin,
  Clock,
  Calendar,
  Users,
  Car,
} from 'lucide-react';

const LOCATIONS: Location[] = ['college', 'station', 'office'];

export default function RequestPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const { createRideRequest } = useDemo();

  const [step, setStep] = useState(1);
  const [from, setFrom] = useState<Location>('college');
  const [to, setTo] = useState<Location>('station');
  const [date, setDate] = useState('2026-10-03');
  const [time, setTime] = useState('10:30 AM');
  const [passengers, setPassengers] = useState<string[]>([user.name, '', '']);
  const [submitted, setSubmitted] = useState(false);

  const addPassenger = () => setPassengers([...passengers, '']);
  const removePassenger = (i: number) => {
    if (i === 0) return;
    setPassengers(passengers.filter((_, idx) => idx !== i));
  };
  const updatePassenger = (i: number, name: string) => {
    const updated = [...passengers];
    updated[i] = name;
    setPassengers(updated);
  };

  const validPassengers = passengers.filter((p) => p.trim() !== '');

  const handleSubmit = () => {
    const passengerList: Passenger[] = validPassengers.map((name, i) => ({
      id: `new-p-${i}`,
      name,
      status: 'PENDING',
    }));

    createRideRequest({
      from,
      to,
      date,
      time,
      passengers: passengerList,
      requestedBy: user.id,
      requestedByName: user.name,
    });

    setSubmitted(true);
  };

  const TIMES = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  ];

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] page-enter px-4">
          <div className="text-center max-w-sm w-full">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 sm:mb-5 check-enter">
              <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ride request created</h2>
            <p className="text-gray-500 text-sm mb-2">
              Your Toto request has been sent to the rider.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md mb-6 sm:mb-8">
              Status: REQUESTED
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto sm:mx-auto">
                Back to Dashboard
              </Button>
              <Button variant="secondary" className="w-full sm:w-auto sm:mx-auto" onClick={() => {
                setSubmitted(false);
                setStep(1);
                setPassengers([user.name, '', '']);
              }}>
                Request Another
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-enter">
        <TopHeader
          title="Request a Toto"
          subtitle="Plan your trip in a few simple steps."
        />

        {/* Stepper */}
        <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-10 overflow-x-auto">
          {[
            { num: 1, label: 'Trip' },
            { num: 2, label: 'Passengers' },
            { num: 3, label: 'Review' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : String(s.num).padStart(2, '0')}
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium ${
                    step >= s.num ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className="w-6 sm:w-12 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="max-w-2xl">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      From
                    </label>
                    <div className="space-y-2">
                      {LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setFrom(loc);
                            if (to === loc) {
                              const alt = LOCATIONS.find((l) => l !== loc);
                              if (alt) setTo(alt);
                            }
                          }}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all cursor-pointer min-h-[48px] ${
                            from === loc
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {getLocationLabel(loc)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      To
                    </label>
                    <div className="space-y-2">
                      {LOCATIONS.filter((l) => l !== from).map((loc) => (
                        <button
                          key={loc}
                          onClick={() => setTo(loc)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all cursor-pointer min-h-[48px] ${
                            to === loc
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {getLocationLabel(loc)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1.5 text-gray-400" />
                      Time
                    </label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer min-h-[48px]"
                    >
                      {TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-center">
                <RouteVisualization from={from} to={to} size="lg" />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} icon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Who is travelling?</h3>
                <p className="text-sm text-gray-500 mb-5 sm:mb-6">
                  Add everyone who will be riding the Toto.
                </p>

                <div className="space-y-3">
                  {passengers.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-500 flex-shrink-0">
                        {name ? getInitials(name) : String(i + 1).padStart(2, '0')}
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updatePassenger(i, e.target.value)}
                        placeholder={`Passenger ${i + 1}`}
                        disabled={i === 0}
                        className={`flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl border text-sm transition-all min-h-[48px] ${
                          i === 0
                            ? 'border-gray-100 bg-gray-50 text-gray-700'
                            : 'border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        }`}
                      />
                      {i === 0 ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex-shrink-0">
                          You
                        </span>
                      ) : (
                        <button
                          onClick={() => removePassenger(i)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addPassenger}
                  className="flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer py-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Passenger
                </button>

                <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    <Users className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    {validPassengers.length} passenger{validPassengers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft className="w-4 h-4" />} className="w-full sm:w-auto">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  icon={<ArrowRight className="w-4 h-4" />}
                  disabled={validPassengers.length === 0}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-5 sm:mb-6">Review your request</h3>

                {/* Trip */}
                <div className="mb-5 sm:mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Trip</p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        {getLocationLabel(from)} → {getLocationLabel(to)}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })} • {time}
                      </p>
                    </div>
                    <div className="flex justify-center sm:justify-end">
                      <RouteVisualization from={from} to={to} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 my-5 sm:my-6" />

                {/* Passengers */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Passengers ({validPassengers.length})
                  </p>
                  <div className="space-y-2">
                    {validPassengers.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 sm:gap-3 py-2">
                        <span className="text-xs text-gray-400 font-medium w-5 text-right">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {getInitials(name)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                        {i === 0 && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex-shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <Button variant="secondary" onClick={() => setStep(2)} icon={<ArrowLeft className="w-4 h-4" />} className="w-full sm:w-auto">
                  Back
                </Button>
                <Button onClick={handleSubmit} icon={<Car className="w-4 h-4" />} className="w-full sm:w-auto">
                  Request Toto
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
