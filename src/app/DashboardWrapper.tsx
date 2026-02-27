"use client";

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line } from 'recharts';
import { Activity, Flame, HeartPulse, ChevronDown, ChevronUp, Dumbbell, Target, History, ActivitySquare, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function DashboardWrapper({ data, plans }: { data: any[], plans: any[] }) {
    const [showPlan, setShowPlan] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
    const [selectedIntradayDate, setSelectedIntradayDate] = useState(data[0]?.date || "");

    const activePlan = plans.find(p => p.id === selectedPlanId);

    // Format data for charts
    const chartData = [...data].reverse().map(d => ({
        ...d,
        displayDate: format(parseISO(d.date), 'MMM dd'),
        rpeDisplay: d.rpe || null,
        painDisplay: d.back_pain_score ?? null
    }));

    // Calculate Symptom-Free Streak (days where pain score is 0 or null)
    let currentStreak = 0;
    for (let i = 0; i < data.length; i++) {
        const score = data[i].back_pain_score;
        if (score === 0 || score === null || score === undefined) {
            currentStreak++;
        } else {
            break; // Streak broken
        }
    }

    // Format data for Intraday HR Chart
    const intradayDataRaw = data.find(d => d.date === selectedIntradayDate)?.heart_rate_data || [];
    const intradayChartData = intradayDataRaw.map((point: any) => ({
        time: format(parseISO(point.timestamp), 'h:mm a'),
        bpm: point.bpm
    }));

    return (
        <div className="space-y-10">

            {/* 0. Streak Counter Banner */}
            <div className="flex items-center justify-between bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-4 md:p-6 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-medium text-white tracking-tight">{currentStreak} Day{currentStreak === 1 ? '' : 's'}</h2>
                        <p className="text-sm text-neutral-400">Symptom-Free Streak (Zero Back Pain)</p>
                    </div>
                </div>
            </div>

            {/* 1. Active Program Section */}
            {activePlan && (
                <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
                    <button
                        onClick={() => setShowPlan(!showPlan)}
                        className="w-full px-6 py-4 flex items-start md:items-center justify-between hover:bg-neutral-800/40 transition-colors group flex-col md:flex-row gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-500/10 rounded-lg group-hover:bg-teal-500/20 transition-colors">
                                <Dumbbell className="w-5 h-5 text-teal-400" />
                            </div>
                            <div className="flex flex-col items-start">
                                <h2 className="text-base font-medium text-neutral-200 tracking-wide">Current Training Program</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-neutral-500 text-xs font-normal">Assigned {format(parseISO(activePlan.date_prescribed), 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                        </div>

                        {/* The dropdown and controls are put in a subcontainer to stop click propagation to the main toggle when changing plans */}
                        <div className="flex items-center gap-3 w-full md:w-auto z-10" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center bg-neutral-950/50 border border-neutral-800/80 rounded-lg px-2 py-1 gap-2 shrink-0">
                                <History className="w-3.5 h-3.5 text-neutral-500" />
                                <select
                                    className="bg-transparent text-xs text-neutral-300 font-medium focus:outline-none appearance-none cursor-pointer hover:text-white"
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                >
                                    {plans.map((p, idx) => (
                                        <option key={p.id} value={p.id} className="bg-neutral-900">
                                            Phase {plans.length - idx}: {format(parseISO(p.date_prescribed), 'MMM dd')}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-neutral-600" />
                            </div>

                            <div className="p-1.5 bg-neutral-800/50 rounded-md text-neutral-400 group-hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors cursor-pointer" onClick={() => setShowPlan(!showPlan)}>
                                {showPlan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                        </div>
                    </button>

                    {showPlan && (
                        <div className="px-6 pb-6 pt-4 border-t border-neutral-800/40">
                            {activePlan.general_notes && (
                                <div className="flex gap-3 items-start mb-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                                    <Target className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-neutral-300 text-sm leading-relaxed">{activePlan.general_notes}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {activePlan.exercises.map((ex: any, i: number) => (
                                    <div key={i} className="flex flex-col p-4 rounded-xl bg-neutral-950/50 border border-neutral-800/50 hover:border-neutral-700/80 transition-colors h-full">

                                        {/* Top Row: Category Badges & Reps */}
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {ex.category && (
                                                    <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-400 border border-neutral-700/50">
                                                        {ex.category}
                                                    </span>
                                                )}
                                                {ex.primary_muscle && (
                                                    <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        {ex.primary_muscle}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md shrink-0 border border-teal-500/20 whitespace-nowrap">
                                                {ex.sets} x {ex.reps_or_time}
                                            </span>
                                        </div>

                                        {/* Exercise Name */}
                                        <span className="font-medium text-neutral-200 text-sm">{ex.name}</span>

                                        {/* Notes */}
                                        {ex.notes && <span className="text-[11px] text-neutral-500 mt-2 leading-relaxed italic">{ex.notes}</span>}
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
                <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex flex-col h-[420px] backdrop-blur-md">
                    <div className="mb-6">
                        <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-neutral-200">
                            <Flame className="w-4 h-4 text-orange-500" />
                            Recovery vs. Exertion
                        </h3>
                        <p className="text-xs text-neutral-500">How prepared you were (Oura Readiness/Sleep) vs. how hard you pushed (RPE/Total Load).</p>
                    </div>
                    <div className="flex-grow w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis yAxisId="left" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} />
                                <YAxis yAxisId="load" orientation="right" hide={true} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#e5e5e5', fontSize: '13px' }}
                                    labelStyle={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '4px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                <Bar yAxisId="load" dataKey="total_load" name="Total Load (lbs)" fill="#525252" radius={[4, 4, 0, 0]} maxBarSize={32} fillOpacity={0.3} />
                                <Area yAxisId="left" type="monotone" dataKey="readiness" name="Oura Readiness" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorReadiness)" />
                                <Line yAxisId="left" type="monotone" dataKey="sleep" name="Oura Sleep" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="rpeDisplay" name="Training RPE (1-10)" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#171717', stroke: '#f97316', strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Chart: Sleep & HRV */}
                <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex flex-col h-[420px] backdrop-blur-md">
                    <div className="mb-6">
                        <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-neutral-200">
                            <HeartPulse className="w-4 h-4 text-rose-500" />
                            Underlying Physiology
                        </h3>
                        <p className="text-xs text-neutral-500">Your Sleep Score correlated with your HRV Balance trend.</p>
                    </div>
                    <div className="flex-grow w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis dataKey="displayDate" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis yAxisId="left" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#e5e5e5', fontSize: '13px' }}
                                    labelStyle={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '4px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="sleep" name="Sleep Score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#171717', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Area yAxisId="right" type="step" dataKey="hrv" name="HRV Balance" stroke="#f43f5e" strokeWidth={1} fill="url(#colorHrv)" fillOpacity={1} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* 3. The Tipping Point (Pain vs Load) */}
            <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex flex-col h-[420px] backdrop-blur-md">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-neutral-200">
                            <ActivitySquare className="w-4 h-4 text-violet-500" />
                            The Tipping Point (Pain vs. Load)
                        </h3>
                        <p className="text-xs text-neutral-500">McGill Capacity Tracking: Finding the maximum pain-free volume threshold.</p>
                    </div>
                </div>
                <div className="flex-grow w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis dataKey="displayDate" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} />

                            {/* Hidden Left Axis just for the bars to scale automatically */}
                            <YAxis yAxisId="load" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />

                            {/* Right Axis is fixed 0-10 for Pain Score */}
                            <YAxis yAxisId="pain" orientation="right" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} />

                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#e5e5e5', fontSize: '13px' }}
                                labelStyle={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '4px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />

                            <Bar yAxisId="load" dataKey="total_load" name="Training Volume (Load)" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} fillOpacity={0.4} />
                            <Line yAxisId="pain" type="monotone" dataKey="painDisplay" name="Back Pain (0-10)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#171717', stroke: '#ef4444', strokeWidth: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* 4. Intraday Heart Rate (5-min intervals) */}
            <section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-6 flex flex-col h-[420px] backdrop-blur-md">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-medium mb-1 flex items-center gap-2 text-neutral-200">
                            <Activity className="w-4 h-4 text-sky-500" />
                            Intraday Autonomic Stress
                        </h3>
                        <p className="text-xs text-neutral-500">Continuous 24-hour heart rate trend (5-minute intervals).</p>
                    </div>

                    {/* Date Selector for Intraday Data */}
                    <div className="flex items-center bg-neutral-950/50 border border-neutral-800/80 rounded-lg px-2 py-1 gap-2 shrink-0">
                        <History className="w-3.5 h-3.5 text-neutral-500" />
                        <select
                            className="bg-transparent text-xs text-neutral-300 font-medium focus:outline-none appearance-none cursor-pointer hover:text-white"
                            value={selectedIntradayDate}
                            onChange={(e) => setSelectedIntradayDate(e.target.value)}
                        >
                            {data.map((d: any) => (
                                <option key={d.date} value={d.date} className="bg-neutral-900">
                                    {format(parseISO(d.date), 'MMM dd, yyyy')}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-neutral-600" />
                    </div>
                </div>

                <div className="flex-grow w-full">
                    {intradayChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={intradayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                {/* For intraday, we have hundreds of points, so we only show a few ticks on the X axis using minTickGap */}
                                <XAxis dataKey="time" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} dy={10} minTickGap={50} />
                                <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#0ea5e9', fontSize: '14px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#a3a3a3', fontSize: '12px', marginBottom: '4px' }}
                                    formatter={(value: number) => [`${value} bpm`, 'Heart Rate']}
                                />
                                <Area type="monotone" dataKey="bpm" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorBpm)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full w-full border border-dashed border-neutral-800 rounded-xl bg-neutral-950/30">
                            <span className="text-sm text-neutral-500">No intraday heart rate data available for this date.</span>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Daily Logs Table */}
            < section className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl overflow-hidden backdrop-blur-md" >
                <div className="px-6 py-5 border-b border-neutral-800/60 flex justify-between items-center bg-neutral-900/50">
                    <h2 className="text-base font-medium flex items-center gap-2 text-neutral-200 tracking-wide">
                        <Activity className="w-4 h-4 text-blue-400" />
                        Athlete Log & Context
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-950/80 text-neutral-500 text-[11px] uppercase tracking-widest">
                                <th className="px-6 py-4 font-medium">Date & Focus</th>
                                <th className="px-6 py-4 font-medium">Metrics (Oura)</th>
                                <th className="px-6 py-4 font-medium text-center">Output (RPE/Load)</th>
                                <th className="px-6 py-4 font-medium w-3/5">Training Notes & Life Stressors</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/40">
                            {data.map((day, i) => (
                                <tr key={i} className="hover:bg-neutral-800/30 transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-neutral-300 font-medium">
                                        <div className="flex flex-col">
                                            <span>{format(parseISO(day.date), 'MMM dd')}</span>
                                            {day.focus && <span className="text-[11px] text-teal-400/80 font-normal mt-0.5">{day.focus}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Readiness</span>
                                                <span className={`font-mono text-sm font-medium ${day.readiness >= 80 ? 'text-emerald-400' : day.readiness >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>{day.readiness || '--'}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Sleep</span>
                                                <span className={`font-mono text-sm font-medium ${day.sleep >= 80 ? 'text-emerald-400' : day.sleep >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>{day.sleep || '--'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-center align-middle">
                                        <div className="flex flex-col items-center gap-2">
                                            {day.rpe ? (
                                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${day.rpe >= 8 ? 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30' :
                                                    day.rpe >= 5 ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' :
                                                        'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                                                    }`}>
                                                    {day.rpe}
                                                </div>
                                            ) : (
                                                <span className="text-neutral-600">-</span>
                                            )}

                                            {day.total_load > 0 && (
                                                <span className="text-[10px] text-neutral-400 font-mono tracking-tight bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                                    {day.total_load.toLocaleString()} lbs
                                                </span>
                                            )}

                                            {/* Pain Badge */}
                                            {day.back_pain_score !== null && day.back_pain_score !== undefined && (
                                                <div className="flex items-center gap-1.5 mt-1 border-t border-neutral-800/80 pt-2 w-full justify-center">
                                                    <span className="text-[9px] uppercase tracking-wider text-neutral-500">Pain:</span>
                                                    <span className={`text-xs font-bold ${day.back_pain_score === 0 ? 'text-emerald-400' :
                                                        day.back_pain_score <= 3 ? 'text-amber-400' : 'text-rose-400'
                                                        }`}>{day.back_pain_score}/10</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 py-4">
                                        <div className="flex flex-col gap-3">
                                            {day.pain_modifiers && (
                                                <div className="flex items-start">
                                                    <span className="text-[10px] uppercase font-semibold text-rose-500/80 tracking-wider mr-2 mt-0.5 w-16 shrink-0">Triggers</span>
                                                    <span className="text-xs bg-rose-500/10 text-rose-300 px-2 py-1 rounded border border-rose-500/20">
                                                        {day.pain_modifiers}
                                                    </span>
                                                </div>
                                            )}
                                            {day.stressors && (
                                                <div className="flex items-start">
                                                    <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider mr-2 mt-0.5 w-16 shrink-0">Stressors</span>
                                                    <span className="text-xs bg-neutral-800/80 text-neutral-300 px-2 py-1 rounded border border-neutral-700/50">
                                                        {day.stressors}
                                                    </span>
                                                </div>
                                            )}
                                            {day.notes && (
                                                <div className="flex items-start">
                                                    <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider mr-2 mt-1 w-16 shrink-0">Notes</span>
                                                    <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">{day.notes}</p>
                                                </div>
                                            )}
                                            {!day.stressors && !day.notes && !day.pain_modifiers && (
                                                <span className="text-xs text-neutral-600 italic">No notes logged.</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section >

        </div >
    );
}
