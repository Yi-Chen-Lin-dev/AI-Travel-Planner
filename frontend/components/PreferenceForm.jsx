"use client";
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const PreferenceForm = () => {
  const router = useRouter();

  // State ปรับชื่อฟิลด์และค่าเริ่มต้นให้ตรงกับ Backend Contract (ข้อ 1-4)
  const [formData, setFormData] = useState({
    destination: 'Taipei, Taiwan — Confirmed TW',
    startDate: '2025-09-18',
    endDate: '2025-09-21',
    budget: 'medium', // 'low' | 'medium' | 'high'
    interests: ['food', 'culture', 'nature'], // 'food' | 'culture' | 'nature' | 'shopping' | 'entertainment'
    transportation: 'public_transport', // 'walking' | 'public_transport' | 'driving'
    pace: 'normal' // 'relaxed' | 'normal' | 'fast'
  });

  // คำนวณระยะเวลาเดินทางแบบไดนามิกจากวันที่จริง (ข้อ 5)
  const calculateDuration = (start, end) => {
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: diffDays + 1,
      nights: diffDays
    };
  };

  const duration = calculateDuration(formData.startDate, formData.endDate);

  const toggleInterest = (interestKey) => {
    setFormData((prev) => {
      const isSelected = prev.interests.includes(interestKey);
      if (isSelected) {
        return { ...prev, interests: prev.interests.filter(id => id !== interestKey) };
      } else {
        return { ...prev, interests: [...prev.interests, interestKey] };
      }
    });
  };

  const handleSubmit = async () => {
    // โครงสร้าง Request Payload สำหรับ POST /preferences/ (ข้อ 6)
    const preferencePayload = {
      trip_id: "temp-trip-uuid",
      budget: formData.budget,
      transportation: formData.transportation,
      pace: formData.pace,
      interests: formData.interests
    };

    console.log("📅 Dynamic Duration:", `${duration.days} Days / ${duration.nights} Nights`);
    console.log("🚀 Payload for POST /preferences/:", preferencePayload);

    alert("Trip preferences prepared successfully!");
    router.push('/itinerary');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EFE5D8] to-[#FDFBF7] p-4 sm:p-8 font-sans text-[#4A3F35]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-[#8C7A6B] tracking-wider uppercase mb-1">Configuration Module</p>
            <h1 className="text-3xl font-semibold text-[#3E2723]">Set Trip Preferences</h1>
          </div>
          <div className="flex items-center gap-2 bg-[#E2D6C8] bg-opacity-50 px-3 py-1 rounded-full text-xs font-medium text-[#5D4A3E]">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> Live Sync
          </div>
        </div>

        {/* 1. Destination */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-semibold text-[#3E2723]">1. Destination</h2>
            <span className="text-sm text-[#8C7A6B] cursor-pointer hover:underline">Change city anytime</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-[#A0522D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              className="w-full pl-12 pr-10 py-3 border border-[#D5C6B6] rounded-xl bg-white text-[#3E2723] font-medium focus:outline-none focus:border-[#A0522D] shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="text-[#8C7A6B]">Popular this week:</span>
            <span onClick={() => setFormData({...formData, destination: 'Taipei, Taiwan'})} className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Taipei</span>
            <span onClick={() => setFormData({...formData, destination: 'Tamsui, Taiwan'})} className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Tamsui</span>
            <span onClick={() => setFormData({...formData, destination: 'Chiang Mai, Thailand'})} className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Chiang Mai</span>
          </div>
        </section>

        {/* 2. Travel Dates & Duration (ข้อ 5) */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-semibold text-[#3E2723]">2. Travel Dates & Duration</h2>
            <span className="text-sm font-medium text-[#A0522D]">Total {duration.days} Days {duration.nights} Nights</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#D5C6B6] rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <div className="w-full">
                <p className="text-xs text-[#8C7A6B]">Start Date</p>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="font-semibold text-[#3E2723] bg-transparent outline-none w-full cursor-pointer"
                />
              </div>
            </div>
            <div className="bg-white border border-[#D5C6B6] rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <div className="w-full">
                <p className="text-xs text-[#8C7A6B]">End Date</p>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="font-semibold text-[#3E2723] bg-transparent outline-none w-full cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center text-sm px-1">
            <span className="flex items-center gap-2 text-[#8C7A6B]">
              <span className="text-orange-400">☀️</span> Autumn cool breeze 24 - 28°C ideal for travel
            </span>
          </div>
        </section>

        {/* 3. Budget Level (ข้อ 1: low | medium | high) */}
        <section>
          <h2 className="text-lg font-semibold text-[#3E2723] mb-3">3. Budget Level <span className="text-base font-normal text-[#8C7A6B]">(Per person, excluding flights)</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'low', label: 'Low', range: '< NT$ 15k', desc: 'Hostels & street food' },
              { value: 'medium', label: 'Medium', range: 'NT$ 15k-35k', desc: 'Boutique hotels & dining' },
              { value: 'high', label: 'High', range: '> NT$ 50k', desc: '5-star & fine dining' }
            ].map((item) => (
              <div 
                key={item.value}
                onClick={() => setFormData({...formData, budget: item.value})}
                className={`p-4 rounded-xl cursor-pointer transition-all border relative ${
                  formData.budget === item.value 
                    ? 'bg-[#A0522D] text-white border-transparent shadow-md' 
                    : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'
                }`}
              >
                {formData.budget === item.value && (
                  <div className="absolute top-4 right-3 bg-white text-[#A0522D] rounded-full p-0.5 z-10 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
                <p className={`text-xs font-bold tracking-wide uppercase mb-1 ${formData.budget === item.value ? 'text-white/80' : 'text-[#8C7A6B]'}`}>{item.label}</p>
                <p className="text-lg font-bold mb-1">{item.range}</p>
                <p className={`text-sm leading-tight ${formData.budget === item.value ? 'text-white/90' : 'text-[#8C7A6B]'}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Interests (ข้อ 4: 5 หมวดหลัก) */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-semibold text-[#3E2723]">4. Interests</h2>
            <span className="text-sm text-[#8C7A6B]">Multi-select</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'food', label: '🍜 Food & Night Markets' },
              { id: 'culture', label: '🏛️ Culture & Ancient Temples' },
              { id: 'nature', label: '⛰️ Nature & Scenery' },
              { id: 'shopping', label: '🛍️ Shopping & Boutiques' },
              { id: 'entertainment', label: '☕ Entertainment & Cafes' }
            ].map((style) => {
              const isSelected = formData.interests.includes(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleInterest(style.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected 
                      ? 'bg-[#A0522D] text-white border-transparent shadow-sm' 
                      : 'bg-white text-[#5D4A3E] border-[#D5C6B6] hover:bg-[#F4ECE1]'
                  }`}
                >
                  {style.label}
                  {isSelected && (
                    <svg className="w-3 h-3 text-white ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 5 & 6. Transportation and Pace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5. Transportation (ข้อ 2: walking | public_transport | driving) */}
          <section>
            <h2 className="text-lg font-semibold text-[#3E2723] mb-3">5. Transportation</h2>
            <div className="space-y-3">
              {[
                { value: 'public_transport', label: 'Public Transit', desc: 'MRT, Metro & Public Buses', icon: '🚆' },
                { value: 'walking', label: 'Walking', desc: 'Pedestrian friendly routes', icon: '🚶' },
                { value: 'driving', label: 'Driving', desc: 'Car & Taxi', icon: '🚗' },
              ].map((item) => (
                <div 
                  key={item.value}
                  onClick={() => setFormData({...formData, transportation: item.value})}
                  className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${
                    formData.transportation === item.value 
                      ? 'bg-[#A0522D] text-white border-transparent shadow-md' 
                      : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{item.icon}</div>
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className={`text-xs ${formData.transportation === item.value ? 'text-white/80' : 'text-[#8C7A6B]'}`}>{item.desc}</p>
                    </div>
                  </div>
                  {formData.transportation === item.value && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 6. Pace (ข้อ 3: relaxed | normal | fast) */}
          <section>
            <h2 className="text-lg font-semibold text-[#3E2723] mb-3">6. Trip Pace</h2>
            <div className="space-y-3">
              {[
                { value: 'relaxed', label: 'Slow Travel: 1-2 spots/day', icon: '⏰' },
                { value: 'normal', label: 'Balanced: 3-4 spots/day', icon: '⏱️' },
                { value: 'fast', label: 'Fast Paced: 5+ spots/day', icon: '⚡' },
              ].map((item) => (
                <div 
                  key={item.value}
                  onClick={() => setFormData({...formData, pace: item.value})}
                  className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${
                    formData.pace === item.value 
                      ? 'bg-[#A0522D] text-white border-transparent shadow-md' 
                      : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{item.icon}</div>
                    <p className="font-semibold">{item.label}</p>
                  </div>
                  {formData.pace === item.value && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Submit Section */}
        <section className="pt-6 border-t border-[#D5C6B6]">
          <div className="flex justify-between items-center text-sm mb-4">
            <span className="flex items-center gap-2 text-[#4A6741] font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              All requirements verified. Ready to generate itinerary.
            </span>
            <span className="text-[#8C7A6B]">AI Accuracy 99.4%</span>
          </div>
          <button 
            type="button"
            onClick={handleSubmit}
            className="w-full bg-[#A0522D] hover:bg-[#8A4525] text-white font-semibold text-lg py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
            ✨ Generate Intelligent AI Trip ({duration.days}D{duration.nights}N) <span className="ml-1">→</span>
          </button>
          <p onClick={() => router.push('/itinerary')}
             className="text-center text-xs text-[#8C7A6B] mt-3 cursor-pointer hover:underline">
            Auto-saved to My Trips. Ready to export and share with travel companions.
          </p>
        </section>

      </div>
    </div>
  );
};

export default PreferenceForm;