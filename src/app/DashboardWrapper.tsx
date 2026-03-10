/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line, ReferenceArea, ReferenceLine } from 'recharts';
import { Activity, Flame, HeartPulse, ChevronDown, ChevronUp, Dumbbell, Target, History, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// --- Symptom Status Helpers ---
const SYMPTOM_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    symptom_free: { label: "Symptom-Free", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    stiff: { label: "Stiff", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    increasingly_stiff: { label: "Increasingly Stiff", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    low_moderate_pain: { label: "Low-Moderate Pain", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
    immobilizing: { label: "Immobilizing", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" },
};

const LOCATION_LABELS: Record<string, string> = {
    low_back: "Low Back",
    hip: "Hip",
    both: "Low Back + Hip",
};

// --- Helper: Convert ISO timestamp to minutes since midnight ---
function isoToMinutesSinceMidnight(isoString: string): number {
    const date = parseISO(isoString);
    return date.getHours() * 60 + date.getMinutes();
}

function minutesToTimeLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}${period}`;
}

// --- Symptom severity color for week strip ---
function symptomDotColor(status: string | undefined): string {
    if (!status) return 'bg-neutral-200';
    if (status === 'symptom_free') return 'bg-emerald-600';
    if (status === 'stiff') return 'bg-amber-400';
    if (status === 'increasingly_stiff') return 'bg-orange-400';
    if (status === 'low_moderate_pain') return 'bg-rose-500';
    if (status === 'immobilizing') return 'bg-red-600';
    return 'bg-neutral-200';
}

// --- LogCard Component ---
function LogCard({ day, planExercises, deltas }: { day: any; planExercises?: any[]; deltas?: any }) {
    const [expanded, setExpanded] = useState(false);

    const hasExtras = !!day.stressors || !!day.pain_modifiers || !!day.symptom_detail;
    const isRestDay = !day.rpe && !day.focus;
    const symptom = day.symptom_status ? SYMPTOM_CONFIG[day.symptom_status] : null;
    const locationLabel = day.symptom_location ? LOCATION_LABELS[day.symptom_location] : null;
    const isFlareDay = day.symptom_status === 'low_moderate_pain' || day.symptom_status === 'immobilizing';

    return (
        <div className={`elevation-1 rounded-2xl overflow-hidden interactive-card ${isFlareDay ? 'border-rose-300 ring-1 ring-rose-200' : 'border-neutral-200'
            }`}>
            <div className="p-4 sm:p-5">
                {/* Header Row: Date, Focus Badge, and Overall Output */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                        <span className="heading-sm">{format(parseISO(day.date), 'EEE, MMM dd')}</span>
                        {day.focus && (
                            <span className="micro-text text-teal-700 bg-teal-50 px-2.5 py-1 rounded inline-flex w-fit border border-teal-200 leading-none">
                                {day.focus}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {day.total_load > 0 && (
                            <span className="micro-text text-neutral-600 font-mono bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
                                {day.total_load.toLocaleString()} lbs
                            </span>
                        )}
                        {day.rpe ? (
                            <div className="flex flex-col items-end gap-1">
                                <span className="label-text text-[9px]">Effort</span>
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${day.rpe >= 8 ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' :
                                    day.rpe >= 5 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' :
                                        'bg-teal-100 text-teal-700 ring-1 ring-teal-300'
                                    }`}>
                                    {day.rpe}
                                </div>
                            </div>
                        ) : (
                            isRestDay && <div className="label-text text-[10px] bg-neutral-100 px-2 py-1 rounded border border-neutral-200">Rest</div>
                        )}
                    </div>
                </div>

                {/* Second Row: Oura Metrics + Symptom Status */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 border-t border-neutral-100 pt-4">
                    <div className="flex flex-col bg-neutral-50 px-3 py-1.5 rounded-lg min-w-[3.5rem] items-center border border-neutral-200">
                        <span className="label-text text-[9px] mb-0.5">Ready</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`font-mono text-sm font-semibold ${day.readiness >= 80 ? 'text-emerald-600' : day.readiness >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{day.readiness || '--'}</span>
                            {deltas?.readiness != null && (
                                <span className={`text-[10px] font-bold tracking-tighter ${deltas.readiness >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {deltas.readiness > 0 ? `+${deltas.readiness}` : deltas.readiness}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col bg-neutral-50 px-3 py-1.5 rounded-lg min-w-[3.5rem] items-center border border-neutral-200">
                        <span className="label-text text-[9px] mb-0.5">Sleep</span>
                        <div className="flex items-baseline gap-1">
                            <span className={`font-mono text-sm font-semibold ${day.sleep >= 80 ? 'text-emerald-600' : day.sleep >= 65 ? 'text-amber-600' : 'text-rose-600'}`}>{day.sleep || '--'}</span>
                            {deltas?.sleep != null && (
                                <span className={`text-[10px] font-bold tracking-tighter ${deltas.sleep >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {deltas.sleep > 0 ? `+${deltas.sleep}` : deltas.sleep}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col bg-neutral-50 px-3 py-1.5 rounded-lg min-w-[3.5rem] items-center border border-neutral-200">
                        <span className="label-text text-[9px] mb-0.5">HRV</span>
                        <div className="flex items-baseline gap-1">
                            <span className="font-mono text-sm font-semibold text-neutral-700">{day.hrv || '--'}</span>
                            {deltas?.hrv != null && (
                                <span className={`text-[10px] font-bold tracking-tighter ${deltas.hrv >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {deltas.hrv > 0 ? `+${deltas.hrv}` : deltas.hrv}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    {/* Symptom Status Badge — or No Report */}
                    {symptom ? (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${symptom.bg} ${symptom.border}`}>
                            <div className="flex flex-col items-end">
                                <span className={`text-sm font-bold ${symptom.color}`}>{symptom.label}</span>
                                {locationLabel && <span className="text-[9px] text-neutral-600 font-medium">{locationLabel}</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50">
                            <span className="text-xs text-neutral-400 font-medium">No report</span>
                        </div>
                    )}
                </div>

                {/* Stressors & Workout Notes — always visible */}
                <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3">
                    {day.stressors && (
                        <div className="flex gap-2 items-start">
                            <span className="label-text text-[10px] mt-0.5 shrink-0">Life</span>
                            <p className="body-text italic">{day.stressors}</p>
                        </div>
                    )}
                    {day.workout_notes && (
                        <div className="flex gap-2 items-start">
                            <span className="label-text text-[10px] mt-0.5 shrink-0">Note</span>
                            <p className="body-text">{day.workout_notes}</p>
                        </div>
                    )}
                    {day.notes && (
                        <div className="flex gap-2 items-start">
                            <span className="label-text text-[10px] mt-0.5 shrink-0">Day</span>
                            <p className="body-text italic border-l-2 border-neutral-200 pl-3">{day.notes}</p>
                        </div>
                    )}
                </div>

                {/* Plan Adherence Bar */}
                {planExercises && planExercises.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                        {(() => {
                            const matchedExercises = planExercises.filter((ex: any) =>
                                day.exercises?.some((exercise: any) =>
                                    (exercise.plan_exercise_id && exercise.plan_exercise_id === ex.exercise_id) ||
                                    exercise.name.toLowerCase().includes(ex.name.toLowerCase().split(' ')[0]) ||
                                    ex.name.toLowerCase().includes(exercise.name.toLowerCase().split(' ')[0])
                                )
                            );

                            return (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="label-text text-[10px]">Plan Adherence</span>
                                        <span className="text-xs font-mono font-bold text-neutral-700">
                                            {matchedExercises.length}/{planExercises.length} exercises
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {planExercises.map((ex: any, i: number) => {
                                            const matchedExercise = day.exercises?.find((exercise: any) =>
                                                (exercise.plan_exercise_id && exercise.plan_exercise_id === ex.exercise_id) ||
                                                exercise.name.toLowerCase().includes(ex.name.toLowerCase().split(' ')[0]) ||
                                                ex.name.toLowerCase().includes(exercise.name.toLowerCase().split(' ')[0])
                                            );
                                            const done = Boolean(matchedExercise);
                                            return (
                                                <div key={i} className="flex flex-col gap-1">
                                                    <div
                                                        title={ex.name}
                                                        className={`micro-text px-2 py-0.5 rounded border truncate max-w-[140px] ${done
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 line-through opacity-60'
                                                            }`}
                                                    >
                                                        {ex.name}
                                                    </div>
                                                    {matchedExercise?.notes && (
                                                        <span className="text-[11px] text-neutral-500 pl-1 leading-tight">
                                                            → {matchedExercise.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Expandable Extras Section (stressors, pain modifiers, symptom detail) */}
            {hasExtras && (
                <div
                    className={`border-t border-neutral-100 bg-neutral-50/50 transition-all duration-200 overflow-hidden ${expanded ? 'opacity-100 max-h-[1000px]' : 'opacity-80 max-h-0'}`}
                >
                    <div className="p-4 sm:p-5 space-y-4">
                        {day.symptom_detail && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                                <span className="label-text text-[10px] text-rose-600 sm:mt-0.5 sm:w-20 shrink-0">Symptoms</span>
                                <span className="body-text bg-rose-50 text-rose-800 px-2.5 py-1.5 rounded-md border border-rose-200 self-start font-medium">
                                    {day.symptom_detail}
                                </span>
                            </div>
                        )}
                        {day.pain_modifiers && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                                <span className="label-text text-[10px] text-rose-600 sm:mt-0.5 sm:w-20 shrink-0">Triggers</span>
                                <span className="body-text bg-rose-50 text-rose-800 px-2.5 py-1.5 rounded-md border border-rose-200 self-start font-medium">
                                    {day.pain_modifiers}
                                </span>
                            </div>
                        )}
                        {day.stressors && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                                <span className="label-text text-[10px] sm:mt-0.5 sm:w-20 shrink-0">Stressors</span>
                                <span className="body-text bg-white text-neutral-800 px-2.5 py-1.5 rounded-md border border-neutral-200 shadow-sm self-start font-medium">
                                    {day.stressors}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Expand Toggle */}
            {hasExtras && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full py-2.5 flex items-center justify-center gap-1.5 label-text text-[11px] hover:text-neutral-900 hover:bg-neutral-100 transition-colors border-t border-neutral-200 bg-neutral-50 rounded-b-2xl"
                >
                    {expanded ? 'Hide Details' : 'Show Clinical Context'}
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    );
}

export default function DashboardWrapper({ data, plans }: { data: any[], plans: any[] }) {
    const dailyFocusRef = useRef<HTMLDivElement>(null);
    const [showPlan, setShowPlan] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
    const [selectedDate, setSelectedDate] = useState(data[0]?.date || "");

    const activePlan = plans.find(p => p.id === selectedPlanId);

    // Format data for charts + HRV 7-day rolling average
    const chartData = useMemo(() => {
        const reversed = [...data].reverse();
        return reversed.map((d, i) => {
            const window = reversed.slice(Math.max(0, i - 6), i + 1).filter(x => x.hrv != null);
            const rollingHrv = window.length > 0 ? Math.round(window.reduce((s, x) => s + x.hrv, 0) / window.length) : null;
            return {
                ...d,
                displayDate: format(parseISO(d.date), 'MMM dd'),
                rpeDisplay: d.rpe || null,
                rollingHrv,
            };
        });
    }, [data]);

    const selectedDateLabel = useMemo(() => {
        try {
            return format(parseISO(selectedDate), 'MMM dd');
        } catch {
            return '';
        }
    }, [selectedDate]);

    // Flare dates (for reference lines on charts)
    const flareDates = useMemo(() =>
        chartData
            .filter(d => d.symptom_status === 'low_moderate_pain' || d.symptom_status === 'immobilizing')
            .map(d => d.displayDate)
        , [chartData]);

    // Calculate Flare-Up Free Streak (only severe statuses break it)
    const FLARE_STATUSES = new Set(['low_moderate_pain', 'immobilizing']);
    let currentStreak = 0;
    let prevStreak = 0;
    for (let i = 0; i < data.length; i++) {
        const status = data[i].symptom_status;
        if (!FLARE_STATUSES.has(status)) {
            currentStreak++;
        } else {
            break;
        }
    }
    // Compute the streak before the current one for the delta arrow
    if (currentStreak > 0 && currentStreak < data.length) {
        // skip past current streak, then skip the flare day, count next run
        let j = currentStreak + 1;
        while (j < data.length && !FLARE_STATUSES.has(data[j].symptom_status)) {
            prevStreak++;
            j++;
        }
    }
    const streakDelta = currentStreak - prevStreak;

    // --- Normalized Intraday HR Data & Selected Daily Log ---
    const availableDates = data
        .filter((d: any) => (d.heart_rate_data && d.heart_rate_data.length > 0) || d.rpe || d.focus)
        .map(d => d.date);

    const handleDaySelect = (date: string) => {
        setSelectedDate(date);
        setTimeout(() => {
            dailyFocusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const selectedIndexInData = data.findIndex(d => d.date === selectedDate);
    const selectedDay = selectedIndexInData !== -1 ? data[selectedIndexInData] : data[0];
    const dayBefore = selectedIndexInData !== -1 && selectedIndexInData < data.length - 1 ? data[selectedIndexInData + 1] : null;

    const deltas = useMemo(() => {
        if (!selectedDay || !dayBefore) return null;
        return {
            readiness: (selectedDay.readiness && dayBefore.readiness) ? selectedDay.readiness - dayBefore.readiness : null,
            sleep: (selectedDay.sleep && dayBefore.sleep) ? selectedDay.sleep - dayBefore.sleep : null,
            hrv: (selectedDay.hrv && dayBefore.hrv) ? selectedDay.hrv - dayBefore.hrv : null,
        };
    }, [selectedDay, dayBefore]);

    const intradayDataRaw = useMemo(() => selectedDay?.heart_rate_data || [], [selectedDay]);
    const sleepPeriods = useMemo(() => selectedDay?.sleep_periods || [], [selectedDay]);

    const intradayChartData = useMemo(() => {
        let points = intradayDataRaw.map((point: any) => ({
            minuteOfDay: isoToMinutesSinceMidnight(point.timestamp),
            bpm: point.bpm,
            time: format(parseISO(point.timestamp), 'h:mm a'),
        })).sort((a: any, b: any) => a.minuteOfDay - b.minuteOfDay);

        // Inject explicit nulls for gaps > 15 minutes to break the chart line
        if (points.length > 0) {
            const paddedPoints = [];
            for (let i = 0; i < points.length; i++) {
                paddedPoints.push(points[i]);
                if (i < points.length - 1) {
                    const currentMin = points[i].minuteOfDay;
                    const nextMin = points[i + 1].minuteOfDay;
                    if (nextMin - currentMin > 15) {
                        paddedPoints.push({
                            minuteOfDay: currentMin + 1,
                            bpm: null,
                            time: ''
                        });
                    }
                }
            }
            points = paddedPoints;
        }

        // Anchor the chart to midnight and midnight so the 24h axis is fixed
        if (points.length > 0) {
            if (points[0].minuteOfDay > 0) {
                points.unshift({ minuteOfDay: 0, bpm: null, time: '12:00 AM' });
            }
            if (points[points.length - 1].minuteOfDay < 1440) {
                points.push({ minuteOfDay: 1440, bpm: null, time: '11:59 PM' });
            }
        }
        return points;
    }, [intradayDataRaw]);

    const averageBpm = useMemo(() => {
        const validPoints = intradayDataRaw.filter((p: any) => p.bpm != null);
        if (validPoints.length === 0) return null;
        return Math.round(validPoints.reduce((s: number, p: any) => s + p.bpm, 0) / validPoints.length);
    }, [intradayDataRaw]);

    // Convert sleep periods to minute-of-day ranges for ReferenceArea shading
    const sleepRanges = useMemo(() => {
        return sleepPeriods.map((sp: any) => ({
            start: isoToMinutesSinceMidnight(sp.bedtime_start),
            end: isoToMinutesSinceMidnight(sp.bedtime_end),
        }));
    }, [sleepPeriods]);

    // X-axis ticks: every 3 hours
    const hourTicks = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];

    // Week strip: last 8 days from data (most recent first → reverse for display)
    const weekStrip = useMemo(() => {
        return data.slice(0, 8).reverse();
    }, [data]);

    // Plan exercises for the selected day's adherence tracker
    const selectedPlanExercises = useMemo(() => {
        if (!selectedDay?.completed_plan_id) return undefined;
        const matchedPlan = plans.find(p => p.id === selectedDay.completed_plan_id);
        return matchedPlan?.exercises;
    }, [selectedDay, plans]);

    return (
        <div className="space-y-10">

            {/* 0. Flare-Up Free Streak Banner */}
            <div className="flex items-center justify-between elevation-1 rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <Zap className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="heading-lg">{currentStreak} Day{currentStreak === 1 ? '' : 's'}</h2>
                            {streakDelta > 0 && (
                                <span className="label-text text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">↑ {streakDelta} from last</span>
                            )}
                            {streakDelta < 0 && (
                                <span className="label-text text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">↓ Reset</span>
                            )}
                        </div>
                        <p className="body-text">Flare-Up Free Streak</p>
                    </div>
                </div>
                <p className="label-text text-[10px] hidden md:block text-neutral-400">Stiffness from training doesn&apos;t count.</p>
            </div>

            {/* Removed top Week-at-a-Glance Strip */}
            {activePlan && (
                <section className="elevation-1 rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setShowPlan(!showPlan)}
                        className="w-full px-6 py-4 flex items-start md:items-center justify-between hover:bg-neutral-50 focus-ring group flex-col md:flex-row gap-4 focus:ring-inset"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors border border-teal-100">
                                <Dumbbell className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="flex flex-col items-start">
                                <h2 className="heading-sm tracking-wide">Current Training Program</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="body-text text-neutral-500">Assigned {format(parseISO(activePlan.date_prescribed), 'MMM dd, yyyy')}</span>
                                    {activePlan.title && (
                                        <span className="micro-text text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                                            {activePlan.title}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center elevation-1 rounded-lg px-2 py-1 gap-2 shrink-0 hover:border-neutral-300 transition-colors focus-within:ring-2 focus-within:ring-teal-500/20">
                                <History className="w-3.5 h-3.5 text-neutral-500" />
                                <select
                                    className="bg-transparent label-text text-[11px] text-neutral-700 focus:outline-none appearance-none cursor-pointer hover:text-neutral-900"
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                >
                                    {plans.map((p, idx) => (
                                        <option key={p.id} value={p.id}>
                                            {(p.title || `Phase ${plans.length - idx}`)}: {format(parseISO(p.date_prescribed), 'MMM dd')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-neutral-400" />
                            </div>

                            <div className="p-1.5 bg-neutral-100 rounded-md text-neutral-500 group-hover:text-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer border border-neutral-200" onClick={() => setShowPlan(!showPlan)}>
                                {showPlan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                        </div>
                    </button>

                    {showPlan && (
                        <div className="px-6 pb-6 pt-4 border-t border-neutral-200 bg-neutral-50/50">
                            {activePlan.general_notes && (
                                <div className="flex gap-3 items-start mb-6 p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
                                    <Target className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-neutral-700 text-sm leading-relaxed">{activePlan.general_notes}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {activePlan.exercises.map((ex: any, i: number) => (
                                    <div key={i} className="flex flex-col p-4 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 transition-colors shadow-sm h-full">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {ex.category && (
                                                    <span className="label-text text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                                                        {ex.category}
                                                    </span>
                                                )}
                                                {ex.primary_muscle && (
                                                    <span className="label-text text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                        {ex.primary_muscle}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="micro-text font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md shrink-0 border border-teal-200 whitespace-nowrap">
                                                {ex.sets} x {ex.reps_or_time}
                                            </span>
                                        </div>
                                        <span className="heading-sm mt-1">{ex.name}</span>
                                        {ex.notes && <span className="micro-text text-neutral-500 mt-2 leading-relaxed italic">{ex.notes}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* 2. Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Main Correlation Chart: Readiness vs RPE */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-6 flex flex-col h-[300px] md:h-[420px] shadow-sm">
                    <div className="mb-4 md:mb-6">
                        <h3 className="text-base font-semibold mb-1 flex items-center gap-2 text-neutral-900">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Recovery vs. Exertion
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium">How prepared you were (Oura Readiness/Sleep) vs. how hard you pushed (RPE).</p>
                    </div>
                    <div className="flex-grow w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />

                                <YAxis yAxisId="left" stroke="#0ea5e9" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} fontWeight={500} dx={-5} />
                                <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} fontWeight={500} dx={5} />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#171717', fontSize: '13px', fontWeight: 600 }}
                                    labelStyle={{ color: '#525252', fontSize: '12px', marginBottom: '4px', fontWeight: 500 }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 500, color: '#525252' }} />
                                {flareDates.map(d => (
                                    <ReferenceLine key={d} x={d} yAxisId="left" stroke="#f43f5e" strokeDasharray="4 3" strokeWidth={1.5} />
                                ))}
                                <ReferenceLine x={selectedDateLabel} yAxisId="left" stroke="#171717" strokeWidth={2} strokeDasharray="3 3" />
                                <Area yAxisId="left" type="monotone" dataKey="readiness" name="Oura Readiness" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReadiness)" dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                <Line yAxisId="left" type="monotone" dataKey="sleep" name="Oura Sleep" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                                <Line yAxisId="right" type="monotone" dataKey="rpeDisplay" name="Effort (RPE 1-10)" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: '#ffffff', stroke: '#f97316', strokeWidth: 2.5 }} activeDot={{ r: 7 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Chart: Sleep & HRV */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-6 flex flex-col h-[300px] md:h-[420px] shadow-sm">
                    <div className="mb-4 md:mb-6">
                        <h3 className="text-base font-semibold mb-1 flex items-center gap-2 text-neutral-900">
                            <HeartPulse className="w-4 h-4 text-rose-500" />
                            Underlying Physiology
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium">Your Sleep Score correlated with your HRV Balance trend.</p>
                    </div>
                    <div className="flex-grow w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />

                                <YAxis yAxisId="left" stroke="#8b5cf6" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} fontWeight={500} dx={-5} />
                                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} dx={5} />

                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#171717', fontSize: '13px', fontWeight: 600 }}
                                    labelStyle={{ color: '#525252', fontSize: '12px', marginBottom: '4px', fontWeight: 500 }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 500, color: '#525252' }} />
                                {flareDates.map(d => (
                                    <ReferenceLine key={d} x={d} yAxisId="left" stroke="#f43f5e" strokeDasharray="4 3" strokeWidth={1.5} />
                                ))}
                                <ReferenceLine x={selectedDateLabel} yAxisId="left" stroke="#171717" strokeWidth={2} strokeDasharray="3 3" />
                                <Line yAxisId="left" type="monotone" dataKey="sleep" name="Sleep Score" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#fff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Area yAxisId="right" type="monotone" dataKey="hrv" name="HRV Balance" stroke="#f43f5e" strokeWidth={2} fill="url(#colorHrv)" fillOpacity={1} dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                                <Line yAxisId="right" type="monotone" dataKey="rollingHrv" name="HRV 7-day Avg" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* 3. Daily Focus (Log + Intraday HR) */}
            <section className="space-y-6 pt-4" ref={dailyFocusRef}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-neutral-900 tracking-wide">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Daily Focus
                        </h2>
                        <p className="text-sm text-neutral-500 font-medium">Athlete log and continuous autonomic stress context for the selected day.</p>
                    </div>
                </div>

                {/* Week-at-a-Glance Strip as Primary Navigator */}
                <div className="elevation-1 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="heading-sm text-neutral-700 tracking-wide">Timeline</h3>
                        <p className="micro-text text-neutral-400">Select a day to inspect details</p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {weekStrip.map((d: any) => {
                            const isSelected = d.date === selectedDate;
                            const dotColor = symptomDotColor(d.symptom_status);
                            const hasWorkout = !!d.rpe;
                            const isAvailable = availableDates.includes(d.date);
                            return (
                                <button
                                    key={d.date}
                                    onClick={() => isAvailable && handleDaySelect(d.date)}
                                    disabled={!isAvailable}
                                    className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all duration-200 focus-ring min-w-[58px] ${isSelected
                                        ? 'bg-neutral-900 border-neutral-900 text-white scale-[1.03] shadow-md'
                                        : isAvailable
                                            ? 'bg-white border-neutral-200 hover:border-neutral-400 text-neutral-700 hover:-translate-y-0.5'
                                            : 'bg-neutral-50 border-neutral-100 text-neutral-300 cursor-default'
                                        }`}
                                >
                                    <span className={`label-text text-[10px] ${isSelected ? 'text-neutral-400' : 'text-neutral-500'
                                        }`}>{format(parseISO(d.date), 'EEE')}</span>
                                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-neutral-800'}`}>
                                        {format(parseISO(d.date), 'd')}
                                    </span>
                                    <div className="flex gap-1 items-center">
                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'opacity-80' : ''} ${dotColor}`} />
                                        {hasWorkout && (
                                            <div className={`w-2 h-2 rounded-sm ${isSelected ? 'bg-blue-300' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-600" /><span className="text-[10px] text-neutral-500">Clear</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[10px] text-neutral-500">Stiff</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] text-neutral-500">Pain</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-600" /><span className="text-[10px] text-neutral-500">Workout</span></div>
                        <div className="flex-1" />
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neutral-200" /><span className="text-[10px] text-neutral-500">No data</span></div>
                    </div>
                </div>

                {/* Render the LogCard for the selected day */}
                <div className="grid grid-cols-1">
                    <LogCard day={selectedDay} planExercises={selectedPlanExercises} deltas={deltas} />
                </div>

                {/* Render the Intraday HR Chart inside the Daily View */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-6 flex flex-col h-[300px] md:h-[380px] shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-neutral-900">
                            <Activity className="w-3.5 h-3.5 text-sky-500" />
                            Intraday Heart Rate
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-medium">
                            Continuous 24-hour trend. <span className="text-indigo-400">■</span> = sleep period.
                            {averageBpm && <span className="ml-2 text-rose-500 font-bold">-- Avg: {averageBpm} bpm</span>}
                        </p>
                    </div>

                    <div className="flex-grow w-full">
                        {intradayChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={intradayChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />

                                    {/* Sleep period shading */}
                                    {sleepRanges.map((range: any, idx: number) => (
                                        <ReferenceArea
                                            key={`sleep-${idx}`}
                                            x1={range.start}
                                            x2={range.end}
                                            fill="#6366f1"
                                            fillOpacity={0.06}
                                            stroke="none"
                                        />
                                    ))}

                                    {/* Normalized X-axis: 0-1440 minutes, ticks every 3 hours */}
                                    <XAxis
                                        dataKey="minuteOfDay"
                                        type="number"
                                        domain={[0, 1440]}
                                        ticks={hourTicks}
                                        tickFormatter={(val) => minutesToTimeLabel(val)}
                                        stroke="#525252"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                        fontWeight={500}
                                    />
                                    <YAxis stroke="#0ea5e9" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} fontWeight={500} dx={-5} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e5e5', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#0ea5e9', fontSize: '14px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#525252', fontSize: '12px', marginBottom: '4px', fontWeight: 500 }}
                                        labelFormatter={(val) => {
                                            const point = intradayChartData.find((d: any) => d.minuteOfDay === val);
                                            return point?.time || minutesToTimeLabel(val as number);
                                        }}
                                        formatter={(value: any) => [`${value} bpm`, 'Heart Rate']}
                                    />
                                    {averageBpm && (
                                        <ReferenceLine
                                            y={averageBpm}
                                            stroke="#f43f5e"
                                            strokeDasharray="3 3"
                                            strokeWidth={1.5}
                                            label={{ position: 'right', value: `Avg: ${averageBpm}`, fill: '#f43f5e', fontSize: 10, fontWeight: 700 }}
                                        />
                                    )}
                                    <Area type="monotone" connectNulls={false} dataKey="bpm" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBpm)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 h-full w-full border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50">
                                <Activity className="w-6 h-6 text-neutral-400 opacity-50" />
                                <span className="body-text">No intraday heart rate data available for this date.</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
