/**
 * src/components/HomeView.tsx
 * Home Page: Trip Creator & Intelligent Planner Workspace
 */

import React, { useState } from 'react';
import { NavTab, Attraction, TripPlan, ItineraryStop } from '../types/trip';

interface HomeViewProps {
  onSelectTab: (tab: NavTab) => void;
  onExploreAttraction: (attraction: Attraction) => void;
  onSelectPlan: (plan: TripPlan) => void;
  onGenerateTrip: (preferences: {
    destination: string;
    budget: 'low' | 'medium' | 'high';
    interests: string[];
    transportation: 'walking' | 'public_transport' | 'driving';
    pace: 'relaxed' | 'normal' | 'fast';
    startDate: string;
    endDate: string;
    durationDays?: number;
    durationNights?: number;
    selectedSpots?: string[];
    title?: string;
    stayOnHome?: boolean;
  }) => void;
  attractions: Attraction[];
  currentPlan: TripPlan;
  savedPlans: TripPlan[];
  pinnedAttractionIds: string[];
  onTogglePin: (attractionId: string) => void;
  currency: 'NT$' | 'USD';
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectTab,
  onExploreAttraction,
  onSelectPlan,
  onGenerateTrip,
  attractions,
  currentPlan,
  savedPlans,
  pinnedAttractionIds,
  onTogglePin,
  currency
}) => {
  const [activeHomeTab, setActiveHomeTab] = useState<'planner' | 'itinerary'>('planner');
  const [tripTitle, setTripTitle] = useState('Taipei Autumn Explorer 4D3N');
  const [destination, setDestination] = useState('taipei');
  const [startDate, setStartDate] = useState('2025-09-18');
  const [endDate, setEndDate] = useState('2025-09-21');
  const [durationDays, setDurationDays] = useState(4);
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium');
  const [vibes, setVibes] = useState<string[]>(['food', 'culture', 'nature']);
  const [transportation, setTransportation] = useState<'walking' | 'public_transport' | 'driving'>('public_transport');
  const [pace, setPace] = useState<'relaxed' | 'normal' | 'fast'>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [copilotStatus] = useState<'Ready' | 'Thinking...' | 'Updated'>('Ready');
  const [copilotMessage] = useState(
    "Afternoon temperatures around 15:00 peak; visiting Taipei 101's air-conditioned observatory first before climbing Xiangshan at 17:45 ensures optimal lighting with zero heat fatigue."
  );

  const availableVibes = [
    { id: 'food', label: 'Food & Night Markets', icon: 'ramen_dining' },
    { id: 'culture', label: 'Culture & Historic Temples', icon: 'temple_buddhist' },
    { id: 'nature', label: 'Nature & Scenic Views', icon: 'landscape' },
    { id: 'shopping', label: 'Shopping & Local Markets', icon: 'shopping_bag' },
    { id: 'entertainment', label: 'Entertainment & Modern Cafes', icon: 'local_cafe' },
  ] as const;

  const presets = [
    {
      id: 'taipei-4d',
      name: '🇹🇼 Taipei Highlights 4D3N',
      city: 'taipei',
      title: 'Taipei Highlights 4D3N',
      days: 4,
      budget: 'medium' as const,
      vibes: ['food', 'nature', 'culture'],
      transportation: 'public_transport' as const
    },
    {
      id: 'taipei-food',
      name: '🍜 Taipei Foodie Tour 3D2N',
      city: 'taipei',
      title: 'Taipei Foodie Tour 3D2N',
      days: 3,
      budget: 'low' as const,
      vibes: ['food', 'shopping'],
      transportation: 'public_transport' as const
    },
    {
      id: 'tokyo-5d',
      name: '🇯🇵 Tokyo Modern & Culture 5D4N',
      city: 'tokyo',
      title: 'Tokyo Modern & Culture 5D4N',
      days: 5,
      budget: 'medium' as const,
      vibes: ['shopping', 'culture', 'entertainment'],
      transportation: 'public_transport' as const
    },
    {
      id: 'chiangmai-3d',
      name: '🇹🇭 Chiang Mai Slow Life 3D2N',
      city: 'chiangmai',
      title: 'Chiang Mai Slow Life 3D2N',
      days: 3,
      budget: 'low' as const,
      vibes: ['nature', 'culture'],
      transportation: 'walking' as const
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setDestination(preset.city);
    setTripTitle(preset.title);
    setDurationDays(preset.days);
    setBudget(preset.budget);
    setVibes(preset.vibes);
    setTransportation(preset.transportation);
    showToast(`Preset "${preset.name}" applied successfully!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleVibe = (vibeLabel: string) => {
    if (vibes.includes(vibeLabel)) {
      setVibes(vibes.filter((v) => v !== vibeLabel));
    } else {
      setVibes([...vibes, vibeLabel]);
    }
  };

  const handleStartGeneration = (stayOnHome = true) => {
    setIsGenerating(true);
    setGenerationStep('Verifying landmark coordinates & opening hours...');

    setTimeout(() => {
      setGenerationStep('Analyzing local transport corridors for optimal transit...');
    }, 500);

    setTimeout(() => {
      setGenerationStep('Harmonizing schedule and scenic sunset timing...');
    }, 1000);

    setTimeout(() => {
      setIsGenerating(false);

      const destName =
        destination === 'taipei'
          ? 'Taipei, Taiwan'
          : destination === 'tokyo'
          ? 'Tokyo, Japan'
          : destination === 'chiangmai'
          ? 'Chiang Mai, Thailand'
          : 'Bangkok, Thailand';

      // 1. ส่งค่าตรงตาม Contract โดยไม่ต้องแมปคำซ้ำซ้อน
      onGenerateTrip({
        title: tripTitle,
        destination: destName,
        budget: budget,
        interests: vibes,
        transportation: transportation,
        pace: pace, // ใช้ค่า 'relaxed' | 'normal' | 'fast' ได้โดยตรง
        startDate,
        endDate,
        durationDays,
        durationNights: Math.max(1, durationDays - 1),
        stayOnHome
      });

      showToast('✨ Trip generated successfully!');

      // 2. สลับแท็บบนหน้าเดิมเฉพาะเมื่อ stayOnHome เป็น true เท่านั้น
      if (stayOnHome) {
        setActiveHomeTab('itinerary');
      }
    }, 1600);
  };

  const recommendedPois = attractions.slice(0, 4);
  const currentDay = currentPlan.days[selectedDayIndex] || currentPlan.days[0];

  return (
    <div className="w-full flex flex-col relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce font-label-md text-label-md">
          <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HERO BANNER */}
      <section className="relative w-full bg-surface-container-low px-space-lg lg:px-margin pt-6 pb-6 overflow-hidden shadow-sm border-b border-outline-variant/30">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-16 w-80 h-80 rounded-full bg-tertiary/5 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col gap-space-md relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Home Trip Planner
              </span>
              <span className="text-outline-variant">•</span>
              <span className="text-primary font-semibold">AI Trip Planner & Creator 4.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-end">
            <div className="lg:col-span-8 space-y-space-xs">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Intelligent Trip Creator —{' '}
                <span className="text-primary">Automated Routing & Scheduling</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                Create a new trip instantly: select a city, dates, budget, travel vibes, and pin your favorite spots. Our AI engine calculates an optimal daily itinerary with minimized transit time via local transport.
              </p>
            </div>

            <div className="lg:col-span-4 flex lg:justify-end">
              <div className="bg-surface-container px-space-md py-space-sm rounded-xl flex items-center gap-space-sm shadow-sm border border-outline-variant/30">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-on-secondary shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                    AI Calculation Engine
                  </p>
                  <p className="font-title-md text-title-md text-on-surface font-semibold">
                    Balanced & Smart Transit
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-space-xs">
            <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              </div>
              <div>
                <span className="font-title-md text-title-md text-on-surface block leading-tight">
                  Instant Creation
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Adjust dates and pin spots directly on home
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </div>
              <div>
                <span className="font-title-md text-title-md text-on-surface block leading-tight">
                  AI Route Planning
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Smart transit and MRT schedule synchronization
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/20">
              <div className="w-8 h-8 rounded-lg bg-tertiary/15 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[18px]">map</span>
              </div>
              <div>
                <span className="font-title-md text-title-md text-on-surface block leading-tight">
                  Save 3+ hours/day
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Geographic ordering, eliminating backtracking
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN PLANNING WORKSPACE */}
      {activeHomeTab === 'planner' ? (
        <main className="w-full max-w-7xl mx-auto px-space-lg lg:px-margin py-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            
            {/* LEFT COLUMN: Trip Preference Form */}
            <section className="lg:col-span-6 flex flex-col gap-space-lg">
              <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm space-y-space-lg border border-outline-variant/30">
                <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
                  <div className="space-y-1">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Trip Creator & Planner Module
                    </span>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Create & Configure Your Trip
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    Live Sync
                  </span>
                </div>

                {/* 0. Trip Title & Fast Presets */}
                <div className="space-y-space-xs pb-space-xs border-b border-outline-variant/20">
                  <label className="font-title-md text-title-md text-on-surface flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-primary">
                      <span className="material-symbols-outlined text-[20px]">edit_note</span>
                      <span>Trip Name</span>
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">Customizable</span>
                  </label>
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g., Ultimate Taipei 4D3N..."
                    className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest text-on-surface font-title-md text-title-md shadow-sm border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  {/* Fast Presets */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        ⚡ Quick Presets (Click to apply):
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="text-left p-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/30 text-on-surface transition-all cursor-pointer shadow-2xs group"
                        >
                          <div className="font-label-md text-label-md font-semibold text-primary group-hover:underline truncate">
                            {preset.name}
                          </div>
                          <div className="text-[12px] text-on-surface-variant truncate">
                            {preset.days} Days • {preset.transportation}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 1. Destination */}
                <div className="space-y-space-xs">
                  <label className="font-title-md text-title-md text-on-surface flex items-center justify-between">
                    <span>1. Destination</span>
                    <span className="font-body-sm text-body-sm text-outline">Select a city</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-primary text-[22px] pointer-events-none">
                      pin_drop
                    </span>
                    <select
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        if (e.target.value === 'tokyo') {
                          setTripTitle('Tokyo Modern & Culture 5D4N');
                          setDurationDays(5);
                        } else if (e.target.value === 'chiangmai') {
                          setTripTitle('Chiang Mai Slow Life 3D2N');
                          setDurationDays(3);
                        } else if (e.target.value === 'taipei') {
                          setTripTitle('Taipei Autumn Explorer 4D3N');
                          setDurationDays(4);
                        }
                      }}
                      className="w-full pl-11 pr-10 py-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer border border-outline-variant/30 font-medium"
                    >
                      <option value="taipei">🇹🇼 Taipei, Taiwan</option>
                      <option value="tokyo">🇯🇵 Tokyo, Japan</option>
                      <option value="chiangmai">🇹🇭 Chiang Mai, Thailand</option>
                      <option value="bangkok">🇹🇭 Bangkok, Thailand</option>
                      <option value="seoul">🇰🇷 Seoul, South Korea</option>
                      <option value="fukuoka">🇯🇵 Fukuoka, Japan</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-3 text-outline pointer-events-none text-[20px]">
                      unfold_more
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs pt-1 overflow-x-auto text-nowrap">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Popular:</span>
                    {(['Taipei', 'Tokyo', 'Chiang Mai', 'Bangkok'] as const).map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          const val = city.toLowerCase().replace(' ', '');
                          setDestination(val);
                          setTripTitle(`${city} City Break`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Travel Dates & Duration */}
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-title-md text-title-md text-on-surface">
                      <span>2. Travel Dates &amp; Duration</span>
                    </label>
                    <div className="flex items-center gap-2 bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/30 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDurationDays(Math.max(1, durationDays - 1))}
                        className="w-7 h-7 rounded-md bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors cursor-pointer text-sm font-bold"
                        title="Decrease days"
                      >
                        -
                      </button>
                      <span className="font-label-md text-label-md font-bold text-primary min-w-[50px] text-center">
                        {durationDays} Days
                      </span>
                      <button
                        type="button"
                        onClick={() => setDurationDays(Math.min(10, durationDays + 1))}
                        className="w-7 h-7 rounded-md bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors cursor-pointer text-sm font-bold"
                        title="Increase days"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div className="relative bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex items-center gap-space-sm border border-outline-variant/30">
                      <span className="material-symbols-outlined text-secondary text-[22px]">calendar_month</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-label-sm text-outline">Start Date</span>
                        <input
                          type="text"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="font-title-md text-title-md text-on-surface font-semibold bg-transparent border-0 outline-none p-0"
                        />
                      </div>
                    </div>
                    <div className="relative bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex items-center gap-space-sm border border-outline-variant/30">
                      <span className="material-symbols-outlined text-secondary text-[22px]">event_available</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-label-sm text-outline">End Date</span>
                        <input
                          type="text"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="font-title-md text-title-md text-on-surface font-semibold bg-transparent border-0 outline-none p-0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-surface-container-high/60 px-space-md py-2 rounded-lg text-on-surface-variant font-body-sm text-body-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">wb_sunny</span>
                      Total Duration:
                    </span>
                    <span className="text-primary font-semibold">
                      {durationDays} Days / {Math.max(1, durationDays - 1)} Nights
                    </span>
                  </div>
                </div>

                
                {/* 3. Budget Level Selector */}
                <div className="space-y-space-xs">
                  <label className="font-title-md text-title-md text-on-surface">
                    3. Budget Level (Per person, excluding flights)
                  </label>
                  <div className="grid grid-cols-3 gap-space-sm">
                    {([
                      { value: 'low', label: 'LOW', range: '< NT$ 15k', desc: 'Hostels & street food' },
                      { value: 'medium', label: 'MEDIUM', range: 'NT$ 15k-35k', desc: 'Boutique hotels & dining' },
                      { value: 'high', label: 'HIGH', range: '> NT$ 50k', desc: '5-star & fine dining' },
                    ] as const).map((item) => (
                      <label
                        key={item.value}
                        onClick={() => setBudget(item.value)}
                        className={`relative flex flex-col p-space-sm rounded-xl cursor-pointer transition-all shadow-sm border ${
                          budget === item.value
                            ? 'bg-primary text-on-primary border-primary shadow-md'
                            : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border-outline-variant/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-label-sm text-label-sm font-semibold uppercase ${budget === item.value ? 'text-on-primary/80' : 'text-outline'}`}>
                            {item.label}
                          </span>
                          {budget === item.value && (
                            <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">check_circle</span>
                          )}
                        </div>
                        <span className="font-title-md text-title-md mt-1 font-semibold">
                          {item.range}
                        </span>
                        <span className={`font-body-sm text-body-sm mt-0.5 ${budget === item.value ? 'text-on-primary/90' : 'text-on-surface-variant'}`}>
                          {item.desc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

               {/* 4. Travel Vibe & Interests */}
                <div className="space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-title-md text-title-md text-on-surface">
                      4. Preferred Travel Style & Vibe
                    </label>
                    <span className="font-label-sm text-label-sm text-outline">Multi-select</span>
                  </div>
                  <div className="flex flex-wrap gap-space-xs">
                    {availableVibes.map((item) => {
                      const isSelected = vibes.includes(item.id); // ใช้ item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleVibe(item.id)} // บันทึก item.id
                          className={`px-3.5 py-2 rounded-xl font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary font-semibold'
                              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border-outline-variant/30'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-on-primary' : 'text-outline'}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                          {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Transportation & 6. Pace */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs">
                  {/* 5. Transportation */}
                  <div className="space-y-space-xs">
                    <label className="font-title-md text-title-md text-on-surface">
                      5. Transportation
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'public_transport' as const, label: 'Public Transit', desc: 'MRT, Metro & Public Buses' },
                        { value: 'walking' as const, label: 'Walking', desc: 'Pedestrian friendly routes' },
                        { value: 'driving' as const, label: 'Driving', desc: 'Car & Taxi' },
                      ].map((item) => (
                        <div
                          key={item.value}
                          onClick={() => setTransportation(item.value)}
                          className={`flex items-center justify-between p-2.5 rounded-lg shadow-sm cursor-pointer transition-all border ${
                            transportation === item.value
                              ? 'bg-surface-container-lowest border-l-4 border-l-primary border-outline-variant/40'
                              : 'bg-surface-container-lowest/60 text-on-surface-variant hover:bg-surface-container-lowest border-transparent'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-sm">{item.label}</p>
                            <p className="text-xs text-on-surface-variant">{item.desc}</p>
                          </div>
                          {transportation === item.value && (
                            <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Pace */}
                  <div className="space-y-space-xs">
                    <label className="font-title-md text-title-md text-on-surface">
                      6. Trip Pace
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'relaxed' as const, label: 'Slow Travel: 1–2 spots/day', icon: 'snooze' },
                        { value: 'normal' as const, label: 'Balanced: 3–4 spots/day', icon: 'pace' },
                        { value: 'fast' as const, label: 'Fast Paced: 5+ spots/day', icon: 'bolt' },
                      ].map((item) => (
                        <div
                          key={item.value}
                          onClick={() => setPace(item.value)}
                          className={`flex items-center justify-between p-2.5 rounded-lg shadow-sm cursor-pointer transition-all border ${
                            pace === item.value
                              ? 'bg-surface-container-lowest border-l-4 border-l-secondary border-outline-variant/40'
                              : 'bg-surface-container-lowest/60 text-on-surface-variant hover:bg-surface-container-lowest border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[20px]">{item.icon}</span>
                            <span className="font-title-md text-title-md text-on-surface text-[15px]">{item.label}</span>
                          </div>
                          {pace === item.value && (
                            <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Readiness indicator & AI Trigger button */}
                <div className="pt-space-md flex flex-col gap-space-sm border-t border-outline-variant/20">
                  <div className="flex items-center justify-between font-label-md text-label-md text-secondary">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Ready to plan: {durationDays} Days • {vibes.length} Styles • {pinnedAttractionIds.length} Pinned Spots</span>
                    </span>
                    <span className="text-outline">AI Accuracy 99.4%</span>
                  </div>

                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleStartGeneration(false)}
                    className="w-full py-4 px-space-lg rounded-xl bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-title-md text-title-md shadow-md flex items-center justify-center gap-space-sm transition-all group cursor-pointer disabled:opacity-75 font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                        <span>{generationStep || 'Generating and calculating itinerary...'}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">
                          auto_awesome
                        </span>
                        <span>✨ Generate &amp; Plan Trip</span>
                        <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveHomeTab('itinerary')}
                      className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      <span>View Itinerary on Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTab('my-trips')}
                      className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30 font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      <span>Open Fullscreen in My Trips</span>
                    </button>
                  </div>

                  <p className="font-label-sm text-label-sm text-center text-outline">
                    Trip is auto-saved to &quot;My Trips&quot;. Export to PDF, adjust times, and navigate with Google Maps.
                  </p>
                </div>
              </div>

              {/* Spatial Routing Engine snippet */}
              <div className="bg-surface-container rounded-xl p-space-md flex items-center justify-between shadow-sm border border-outline-variant/20">
                <div className="flex items-center gap-space-sm">
                  <div className="w-12 h-12 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[24px]">insights</span>
                  </div>
                  <div>
                    <p className="font-title-md text-title-md text-on-surface font-semibold">
                      Spatial Routing Engine
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Grouping POIs along MRT Red &amp; Blue Line corridors to minimize transit time.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block font-label-sm text-label-sm px-2.5 py-1 rounded bg-surface-container-highest text-on-surface font-mono">
                  Taipei_v4.onnx
                </span>
              </div>
            </section>

            {/* RIGHT COLUMN: AI Live Recommendation & POI Selection preview */}
            <section className="lg:col-span-6 flex flex-col gap-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Recommended Highlights For You
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-semibold">
                      12 Curated Spots
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Selected by your preferences: Cafes, night markets, and nature
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('top-attractions')}
                  className="self-start sm:self-auto flex items-center gap-1 text-primary hover:text-primary-container font-label-md text-label-md transition-colors cursor-pointer"
                >
                  <span>View all</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* 4 Curated Bento POI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {recommendedPois.map((poi) => {
                  const isPinned = pinnedAttractionIds.includes(poi.id);
                  return (
                    <article key={poi.id} className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-all border border-outline-variant/30">
                      <div className="relative h-48 w-full overflow-hidden bg-surface-container">
                        <img src={poi.imageUrl} alt={poi.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-black/20" />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-md bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center gap-1 shadow-sm font-semibold">
                            <span className="material-symbols-outlined text-[14px]">stars</span>
                            {poi.matchScore || 95}% Match
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <button onClick={() => onTogglePin(poi.id)} className="w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm text-primary flex items-center justify-center hover:bg-surface-container-lowest transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">{isPinned ? 'favorite' : 'favorite_border'}</span>
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-on-primary">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary-fixed font-semibold">{poi.districtName}</span>
                          <h3 className="font-title-md text-title-md text-surface-bright leading-snug">{poi.name}</h3>
                        </div>
                      </div>
                      <div className="p-space-sm flex-1 flex flex-col justify-between gap-space-sm">
                        <div className="space-y-1">
                          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{poi.description}</p>
                          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm pt-1">
                            <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">subway</span>{poi.mrtStation.split('(')[0]}</span>
                            <span>•</span><span>Rec. {poi.recommendedDuration}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => onTogglePin(poi.id)} className={`flex-1 py-2 px-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${isPinned ? 'bg-secondary text-on-secondary font-semibold' : 'bg-primary text-on-primary hover:bg-primary-container'}`}>
                            <span className="material-symbols-outlined text-[18px]">{isPinned ? 'check' : 'add_location_alt'}</span>
                            <span>{isPinned ? 'Pinned' : '+ Pin to Trip'}</span>
                          </button>
                          <button onClick={() => onExploreAttraction(poi)} className="py-2 px-3 rounded-lg bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer border border-outline-variant/30">
                            Details
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Geographic Density Preview Card */}
              <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm space-y-space-sm border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">map</span>
                    <h4 className="font-title-md text-title-md text-on-surface font-semibold">Geographic Density Preview</h4>
                  </div>
                  <span className="font-label-sm text-label-sm text-outline">MRT Red Line based</span>
                </div>
                <div className="w-full h-44 bg-cover bg-center rounded-xl relative overflow-hidden flex items-end p-space-sm shadow-inner" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB5F0EkxINy6eS1xAx210LIuz5ixUKH8EspG_e8n7GDS0PZvXb9AhaNN7re7vyRz8nTeOFw6fs--Jw-Knud3NTGd2v2Q3F6TQXZpZAvl_mZSIMRc65-E0nk92x1HUNbfVP5r1joK27k1d-IPAkpcDQAKh2S9OpmtN64Q0ivsTZepGqPOieWGCA2mt9fPdzlddGOnjtFbicc7LGOsXbCmkKdupE7hS0ELHEOR4bwWSwub6RXz76g3_0')" }}>
                  <div className="bg-surface/90 backdrop-blur-md px-3 py-2 rounded-lg text-on-surface font-body-sm text-body-sm shadow-sm flex items-center justify-between w-full border border-outline-variant/30">
                    <span className="flex items-center gap-1.5 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" /> Average transit: 18 min / spot</span>
                    <button onClick={() => setActiveHomeTab('itinerary')} className="font-label-sm text-label-sm text-primary font-semibold hover:underline cursor-pointer">Expand map ➔</button>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-6 z-20 w-full bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-space-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-space-sm border border-outline-variant/40">
                <div className="flex items-center gap-space-sm w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">bookmark_added</span>
                  </div>
                  <div>
                    <p className="font-title-md text-title-md text-on-surface font-semibold">{pinnedAttractionIds.length} Landmarks Pinned</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Ready with detailed day-by-day structure</p>
                  </div>
                </div>
                <button onClick={() => setActiveHomeTab('itinerary')} className="w-full sm:w-auto px-space-lg py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-center cursor-pointer font-semibold">
                  <span>View Itinerary &amp; Map</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </section>
          </div>
        </main>
      ) : (
        /* 3. INTEGRATED DAY-BY-DAY SCHEDULE PREVIEW ON HOME */
        <main className="w-full max-w-7xl mx-auto px-space-lg pb-space-xl pt-space-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-7 flex flex-col space-y-space-md">
              <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center justify-between gap-1 overflow-x-auto shadow-sm border border-outline-variant/30">
                {currentPlan.days.map((d, index) => {
                  const isActive = selectedDayIndex === index;
                  return (
                    <button key={d.dayNumber} onClick={() => setSelectedDayIndex(index)} className={`flex-1 py-2.5 px-3 rounded-lg font-label-md text-label-md transition-all text-center whitespace-nowrap cursor-pointer ${isActive ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}>
                      {d.dateStr}
                    </button>
                  );
                })}
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm shadow-sm border border-outline-variant/30">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">route</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Day {currentDay.dayNumber} Route Stats</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Total Distance <strong className="text-on-surface">{currentDay.routeStats.totalDistanceKm} km</strong> | Total Transit Time ~{currentDay.routeStats.totalTransitMinutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-space-xs font-body-sm text-body-sm bg-surface-container px-3 py-1.5 rounded-lg text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">wb_sunny</span>
                  <span>{currentDay.routeStats.weather}</span>
                  <span className="text-outline-variant">|</span>
                  <span className="text-primary font-semibold">{currentDay.routeStats.primaryMrtLine}</span>
                </div>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-space-md">
                <div className="absolute left-3 sm:left-4 top-4 bottom-4 w-0.5 bg-outline-variant/60 -translate-x-1/2" />
                {currentDay.stops.map((stop, idx) => (
                  <React.Fragment key={stop.id}>
                    <div className="relative group">
                      <div className="absolute -left-6 sm:-left-8 top-5 w-6 h-6 rounded-full bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center shadow-md font-bold">{idx + 1}</div>
                      <div className="bg-surface-container-low hover:bg-surface-container rounded-xl p-space-md shadow-sm transition-all duration-200 border border-outline-variant/30">
                        <div className="flex flex-col sm:flex-row gap-space-md">
                          <div className="w-full sm:w-36 h-28 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
                            <img src={stop.imageUrl} alt={stop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-space-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold">{stop.timeSlot} ({stop.duration})</span>
                                  {stop.badgeStatus && <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">{stop.badgeStatus}</span>}
                                </div>
                              </div>
                              <h3 className="font-title-md text-title-md text-on-surface mt-1 font-semibold">{stop.title}</h3>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{stop.description}</p>
                            </div>
                            <div className="flex items-center gap-space-md pt-2 mt-2 font-label-sm text-label-sm flex-wrap">
                              {stop.microTags.map((tag, tIdx) => (
                                <span key={tIdx} className={`inline-flex items-center gap-1 ${tag.color || 'text-on-surface-variant'}`}>
                                  <span className="material-symbols-outlined text-[15px]">{tag.icon}</span><span>{tag.text}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {stop.transitToNext && (
                      <div className="relative py-1 flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        <div className="px-3 py-1.5 rounded-lg bg-surface-container flex items-center gap-space-xs text-on-surface shadow-xs border border-outline-variant/30">
                          <span className="material-symbols-outlined text-[18px] text-primary">directions_subway</span>
                          <span>{stop.transitToNext.description}</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-4">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Want to modify preferences, budget, or dates for this trip?</span>
                <button onClick={() => setActiveHomeTab('planner')} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all cursor-pointer whitespace-nowrap">Edit Trip Preferences</button>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col space-y-space-md lg:sticky lg:top-24">
              <div className="bg-surface-container-low rounded-xl p-space-sm shadow-sm overflow-hidden flex flex-col space-y-space-xs border border-outline-variant/30">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">Route Map (Day {currentDay.dayNumber})</span>
                    <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  </div>
                  <button onClick={() => onSelectTab('my-trips')} className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer">Open in My Trips ➔</button>
                </div>
                <div className="relative w-full h-[300px] rounded-lg overflow-hidden shadow-inner">
                  <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDyM6_U5yRkTdnUTEZuPPmYOzTeGLVM0tS6bwUK0BH6D9kew7BvY6eGt3geAcM9c6F2PLBdk8DNP4h1biQ_OaK6_nwLznu92crzLsV5x494L30atDo4qC61obB6nsCfPeNFDRknaRv_855XHDgH9f5OLkTW006mgfqJeO02LKNBsXrzHGRywxu8CxymmJGiP-AsLAVnQul5sMw5IpiCaqvQ9NhzBjdKdfjEMNC24UuH5_fSlgZHNhY')" }} />
                  <div className="absolute inset-0 bg-inverse-surface/10 pointer-events-none" />
                  <div className="absolute top-8 left-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm text-on-surface font-label-sm text-label-sm"><span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">1</span><span>CKS Memorial</span></div>
                  <div className="absolute top-28 left-28 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm text-on-surface font-label-sm text-label-sm"><span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">2</span><span>Yongkang St</span></div>
                  <div className="absolute bottom-24 right-16 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm text-on-surface font-label-sm text-label-sm"><span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">3</span><span>Taipei 101</span></div>
                  <div className="absolute bottom-10 right-8 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm text-on-surface font-label-sm text-label-sm"><span className="w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px]">4</span><span>Xiangshan</span></div>
                </div>
                <div className="pt-1">
                  <a className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-all shadow-sm active:scale-98 cursor-pointer font-semibold" href="https://maps.google.com" rel="noopener noreferrer" target="_blank">
                    <span className="material-symbols-outlined text-[18px]">explore</span><span>Start Navigation (Google Maps)</span>
                  </a>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm space-y-space-sm border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <div className="w-7 h-7 rounded-lg bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center"><span className="material-symbols-outlined text-[17px]">auto_awesome</span></div>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">AI Trip Copilot</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-full font-semibold">{copilotStatus}</span>
                </div>
                <div className="bg-surface-container rounded-lg p-space-sm text-body-sm font-body-sm text-on-surface-variant flex gap-space-xs items-start border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">lightbulb</span>
                  <p className="leading-relaxed"><strong className="text-on-surface font-semibold">AI Suggestion:</strong> {copilotMessage}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 4. CURATED DESTINATIONS CAROUSEL / HIGHLIGHTS */}
      <section className="w-full bg-surface-container-low py-space-xl border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-space-lg lg:px-margin space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Trending Alternative Plans</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Ready-to-Travel Masterpiece Routes</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">One-click load full multi-day itineraries for other popular travel hubs.</p>
            </div>
            <button onClick={() => onSelectTab('day-trips')} className="inline-flex items-center gap-1 text-primary hover:text-primary-container font-label-md text-label-md font-semibold cursor-pointer">
              <span>Explore Day Trips &amp; Tours</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {savedPlans.map((plan) => (
              <div key={plan.id} onClick={() => { onSelectPlan(plan); showToast(`Switched active plan to ${plan.title}!`); setActiveHomeTab('itinerary'); }} className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">{plan.durationDays}D{plan.durationNights}N</span>
                    <span className="font-label-sm text-label-sm text-outline">{plan.spotsCount} curated spots</span>
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors mt-2">{plan.title}</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{plan.subtitle}</p>
                </div>
                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-secondary font-label-sm text-label-sm">
                  <span>🚇 {plan.transitSummary}</span>
                  <span className="text-primary font-semibold flex items-center gap-0.5"><span>Open Plan</span><span className="material-symbols-outlined text-[16px]">arrow_forward</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};