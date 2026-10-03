'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, useCurrentUser } from '@/lib/app-state';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useApiData } from '@/lib/use-api';
import { LOCATIONS, type Location, type Meta, type RideRequest } from '@/lib/types';
import { cleanName, toDateInput, toScheduledIso, validatePassengers, validateSchedule } from '@/lib/validation';
import AppLayout from '@/components/layout/AppLayout';
import TopHeader from '@/components/layout/TopHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import RouteVisualization from '@/components/rides/RouteVisualization';
import { getLocationLabel, getInitials, formatDateFull, formatTime } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Check,
  Plus,
  X,
  MapPin,
  Clock,
  Calendar,
  Users,
  Car,
} from 'lucide-react';

/** 15-minute slots, 07:00 – 20:45 (value HH:mm, label 10:30 AM). */
const TIMES = Array.from({ length: 56 }, (_, i) => {
  const minutes = 7 * 60 + i * 15;
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const label = `${String(hh % 12 || 12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  return { value, label };
});

const DEFAULT_META: Meta = { locations: [...LOCATIONS], tripDurationMinutes: 30, maxPassengers: 6, maxBookingDaysAhead: 60 };

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateInput(d);
}

export default function RequestPage() {
  return (
    <AppLayout allow="PASSENGER">
      <RequestWizard />
    </AppLayout>
  );
}

function RequestWizard() {
  const router = useRouter();
  const user = useCurrentUser();
  const { addToast } = useApp();
  const meta = useApiData<Meta>('/meta').data ?? DEFAULT_META;

  const [step, setStep] = useState(1);
  const [from, setFrom] = useState<Location>('College');
  const [to, setTo] = useState<Location>('Station');
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState('10:00');
  const [passengers, setPassengers] = useState<string[]>([user.name, '']);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RideRequest | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showRowErrors, setShowRowErrors] = useState(false);

  // Blank rows are ignored; everything else must be a valid, unique name.
  const filled = passengers.map(cleanName).filter((p) => p !== '');
  const rowErrors = useMemo(() => {
    const nonEmpty = passengers.map((p, i) => ({ p, i })).filter(({ p }) => cleanName(p) !== '');
    const { rows } = validatePassengers(nonEmpty.map(({ p }) => p), meta.maxPassengers);
    const out: Record<number, string> = {};
    nonEmpty.forEach(({ i }, j) => {
      if (rows[j]) out[i] = rows[j];
    });
    return out;
  }, [passengers, meta.maxPassengers]);
  const passengersValid = filled.length > 0 && filled.length <= meta.maxPassengers && Object.keys(rowErrors).length === 0;

  const addPassenger = () => {
    if (passengers.length < meta.maxPassengers) setPassengers([...passengers, '']);
  };
  const removePassenger = (i: number) => {
    if (passengers.length === 1) return;
    setPassengers(passengers.filter((_, idx) => idx !== i));
  };
  const updatePassenger = (i: number, name: string) => {
    const updated = [...passengers];
    updated[i] = name;
    setPassengers(updated);
  };

  const goToPassengers = () => {
    const err = validateSchedule(date, time, meta.maxBookingDaysAhead);
    setScheduleError(err);
    if (!err) setStep(2);
  };

  const goToReview = () => {
    setShowRowErrors(true);
    if (passengersValid) setStep(3);
  };

  const handleSubmit = async () => {
    const scheduledAt = toScheduledIso(date, time);
    const scheduleErr = validateSchedule(date, time, meta.maxBookingDaysAhead);
    if (!scheduledAt || scheduleErr) {
      setScheduleError(scheduleErr);
      setStep(1);
      return;
    }

    setSubmitting(true);
    setServerErrors({});
    try {
      const data = await api.post<{ request: RideRequest; clashed: boolean }>('/requests', {
        from,
        to,
        scheduledAt,
        passengers: filled.map((name) => ({ name })),
      });
      setResult(data.request);
      if (data.clashed) addToast('warning', 'The Toto is already booked at that time — request marked as clashed.');
      else addToast('success', 'Ride request sent to the rider');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        const fields = err.fieldErrors;
        setServerErrors(fields);
        const keys = Object.keys(fields);
        if (keys.some((k) => k === 'from' || k === 'to' || k === 'scheduledAt')) {
          setScheduleError(fields.scheduledAt ?? fields.to ?? fields.from ?? null);
          setStep(1);
        } else if (keys.some((k) => k.startsWith('passengers'))) {
          setStep(2);
        }
      }
      addToast('error', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setStep(1);
    setPassengers([user.name, '']);
    setServerErrors({});
    setShowRowErrors(false);
  };

  const timeLabel = TIMES.find((t) => t.value === time)?.label ?? time;
  const scheduledIso = toScheduledIso(date, time);
  const passengerServerError = serverErrors.passengers;

  if (result) {
    const clashed = result.status === 'CLASHED';
    return (
      <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] page-enter px-4">
        <div className="text-center max-w-sm w-full">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 check-enter ${
              clashed ? 'bg-amber-100' : 'bg-green-100'
            }`}
          >
            {clashed ? (
              <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
            ) : (
              <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {clashed ? 'Time slot unavailable' : 'Ride request created'}
          </h2>
          <p className="text-gray-500 text-sm mb-3">
            {clashed
              ? result.statusReason ?? 'The Toto is already assigned for this time.'
              : 'Your Toto request has been sent to the rider.'}
          </p>
          <p className="text-xs text-gray-400 mb-3">
            {getLocationLabel(result.from)} → {getLocationLabel(result.to)} · {formatDateFull(result.scheduledAt)},{' '}
            {formatTime(result.scheduledAt)}
          </p>
          <div className="mb-6 sm:mb-8">
            <StatusBadge status={result.status} size="md" />
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/rides/${result.id}`)} className="w-full sm:w-auto sm:mx-auto">
              View Request
            </Button>
            <Button variant="secondary" className="w-full sm:w-auto sm:mx-auto" onClick={resetForm}>
              {clashed ? 'Pick Another Time' : 'Request Another'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <TopHeader title="Request a Toto" subtitle="Plan your trip in a few simple steps." />

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
                  step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : String(s.num).padStart(2, '0')}
              </div>
              <span className={`text-xs sm:text-sm font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
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
                  <div className="space-y-2" role="radiogroup" aria-label="From">
                    {meta.locations.map((loc) => (
                      <button
                        key={loc}
                        role="radio"
                        aria-checked={from === loc}
                        onClick={() => {
                          setFrom(loc);
                          if (to === loc) {
                            const alt = meta.locations.find((l) => l !== loc);
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
                  {/* Same source and destination is impossible: the pickup is not offered here. */}
                  <div className="space-y-2" role="radiogroup" aria-label="To">
                    {meta.locations
                      .filter((l) => l !== from)
                      .map((loc) => (
                        <button
                          key={loc}
                          role="radio"
                          aria-checked={to === loc}
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
                  <label htmlFor="ride-date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Date
                  </label>
                  <input
                    id="ride-date"
                    type="date"
                    value={date}
                    min={toDateInput(new Date())}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setScheduleError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px]"
                  />
                </div>
                <div>
                  <label htmlFor="ride-time" className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1.5 text-gray-400" />
                    Time
                  </label>
                  <select
                    id="ride-time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      setScheduleError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer min-h-[48px]"
                  >
                    {TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {scheduleError && (
                <p role="alert" className="text-sm text-red-600 mt-4">
                  {scheduleError}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Each trip reserves the Toto for about {meta.tripDurationMinutes} minutes.
              </p>
            </div>

            {/* Live preview */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-center">
              <RouteVisualization from={from} to={to} size="lg" />
            </div>

            <div className="flex justify-end">
              <Button onClick={goToPassengers} icon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
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
                Add everyone who will be riding the Toto. You can request on behalf of a group.
              </p>

              <div className="space-y-3">
                {passengers.map((name, i) => {
                  const err = (showRowErrors && rowErrors[i]) || serverErrors[`passengers.${i}.name`];
                  const isYou = cleanName(name).toLowerCase() === user.name.toLowerCase();
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs sm:text-sm font-semibold text-gray-500 flex-shrink-0">
                          {name.trim() ? getInitials(name) : String(i + 1).padStart(2, '0')}
                        </div>
                        <input
                          type="text"
                          value={name}
                          maxLength={60}
                          onChange={(e) => updatePassenger(i, e.target.value)}
                          placeholder={`Passenger ${i + 1}`}
                          aria-label={`Passenger ${i + 1} name`}
                          aria-invalid={!!err}
                          className={`flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-xl border text-sm transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            err ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                        {isYou && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex-shrink-0">
                            You
                          </span>
                        )}
                        <button
                          onClick={() => removePassenger(i)}
                          disabled={passengers.length === 1}
                          aria-label={`Remove passenger ${i + 1}`}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {err && <p className="text-xs text-red-600 mt-1 ml-11 sm:ml-12">{err}</p>}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addPassenger}
                disabled={passengers.length >= meta.maxPassengers}
                className="flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer py-2 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Passenger
              </button>

              <div className="mt-5 sm:mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  <Users className="w-4 h-4 inline mr-1.5 text-gray-400" />
                  {filled.length} passenger{filled.length !== 1 ? 's' : ''} · max {meta.maxPassengers}
                </p>
                {(passengerServerError || (showRowErrors && filled.length === 0)) && (
                  <p className="text-sm text-red-600 mt-2">{passengerServerError ?? 'Add at least one passenger'}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft className="w-4 h-4" />} className="w-full sm:w-auto">
                Back
              </Button>
              <Button onClick={goToReview} icon={<ArrowRight className="w-4 h-4" />} className="w-full sm:w-auto">
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
                      {scheduledIso ? formatDateFull(scheduledIso) : date} • {timeLabel}
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
                  Passengers ({filled.length})
                </p>
                <div className="space-y-2">
                  {filled.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 py-2">
                      <span className="text-xs text-gray-400 font-medium w-5 text-right">{String(i + 1).padStart(2, '0')}</span>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {getInitials(name)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{name}</span>
                      {name.toLowerCase() === user.name.toLowerCase() && (
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
              <Button variant="secondary" onClick={() => setStep(2)} icon={<ArrowLeft className="w-4 h-4" />} className="w-full sm:w-auto" disabled={submitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} loading={submitting} icon={<Car className="w-4 h-4" />} className="w-full sm:w-auto">
                Request Toto
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
