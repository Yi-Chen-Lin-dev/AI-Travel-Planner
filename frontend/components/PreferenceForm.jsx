"use client";

import React, { useState } from 'react';

const PreferenceForm = () => {
  
  const [formData, setFormData] = useState({
    destination: 'Taipei, Taiwan — Confirmed TW',
    startDate: '2025-09-18',
    endDate: '2025-09-21',
    budget: 'moderate',
    travelStyles: ['cafes', 'night_markets', 'nature'],
    transit: 'mrt',
    pacing: 'balanced'
  });

  // ฟังก์ชันจัดการการคลิกเลือกแบบหลายข้อ (Multi-select)
  const toggleStyle = (styleId) => {
    setFormData((prev) => {
      const isSelected = prev.travelStyles.includes(styleId);
      if (isSelected) {
        return { ...prev, travelStyles: prev.travelStyles.filter(id => id !== styleId) };
      } else {
        return { ...prev, travelStyles: [...prev.travelStyles, styleId] };
      }
    });
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
            <span className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Taipei</span>
            <span className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Tokyo</span>
            <span className="px-3 py-1 bg-white border border-[#D5C6B6] rounded-full text-[#5D4A3E] cursor-pointer hover:bg-[#F4ECE1]">Chiang Mai</span>
          </div>
        </section>

        {/* 2. Travel Dates & Duration */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-semibold text-[#3E2723]">2. Travel Dates & Duration</h2>
            <span className="text-sm font-medium text-[#A0522D]">Total 4 Days 3 Nights</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#D5C6B6] rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <div>
                <p className="text-xs text-[#8C7A6B]">Start Date</p>
                <p className="font-semibold text-[#3E2723]">18 Sep 2025</p>
              </div>
            </div>
            <div className="bg-white border border-[#D5C6B6] rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-[#8C7A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <div>
                <p className="text-xs text-[#8C7A6B]">End Date</p>
                <p className="font-semibold text-[#3E2723]">21 Sep 2025</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-between items-center text-sm px-1">
            <span className="flex items-center gap-2 text-[#8C7A6B]">
              <span className="text-orange-400">☀️</span> Autumn cool breeze 24 - 28°C ideal for travel
            </span>
            <span className="text-[#A0522D] font-medium cursor-pointer">Edit</span>
          </div>
        </section>

        {/* 3. Budget Level */}
        <section>
          <h2 className="text-lg font-semibold text-[#3E2723] mb-3">3. Budget Level <span className="text-base font-normal text-[#8C7A6B]">(Per person, excluding flights)</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Economy */}
            <div 
              onClick={() => setFormData({...formData, budget: 'economy'})}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${formData.budget === 'economy' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
            >
              <p className={`text-xs font-bold tracking-wide uppercase mb-1 ${formData.budget === 'economy' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>Economy</p>
              <p className="text-lg font-bold mb-1">&lt; $NT1,000</p>
              <p className={`text-sm leading-tight ${formData.budget === 'economy' ? 'text-white/90' : 'text-[#8C7A6B]'}`}>Hostels & street food</p>
            </div>
            
            {/* Moderate */}
            <div 
              onClick={() => setFormData({...formData, budget: 'moderate'})}
              className={`p-4 rounded-xl cursor-pointer transition-all border relative overflow-hidden ${formData.budget === 'moderate' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
            >
              {formData.budget === 'moderate' && (
                <div className="absolute top-4 right-3 bg-white text-[#A0522D] rounded-full p-0.5 z-10 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
              )}
              <p className={`text-xs font-bold tracking-wide uppercase mb-1 pr-6 ${formData.budget === 'moderate' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>Moderate</p>
              {/* ปรับขนาดตัวอักษร บีบช่องไฟ และเว้นที่ว่างด้านขวา (pr-8) เพื่อไม่ให้ชนไอคอน */}
              <p className="text-base sm:text-lg font-bold mb-1 tracking-tight pr-8">$NT15,000-$NT35,000</p>
              <p className={`text-sm leading-tight ${formData.budget === 'moderate' ? 'text-white/90' : 'text-[#8C7A6B]'}`}>Boutique hotels, cafes & restaurants</p>
            </div>

            {/* Luxury */}
            <div 
              onClick={() => setFormData({...formData, budget: 'luxury'})}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${formData.budget === 'luxury' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
            >
              <p className={`text-xs font-bold tracking-wide uppercase mb-1 ${formData.budget === 'luxury' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>Luxury</p>
              <p className="text-lg font-bold mb-1">&gt; $35,000</p>
              <p className={`text-sm leading-tight ${formData.budget === 'luxury' ? 'text-white/90' : 'text-[#8C7A6B]'}`}>5-star hotels & fine dining</p>
            </div>
          </div>
        </section>

        {/* 4. Preferred Travel Style */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-lg font-semibold text-[#3E2723]">4. Preferred Travel Style & Vibe</h2>
            <span className="text-sm text-[#8C7A6B]">Multi-select</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'cafes', label: '☕ Cafes & Photo Spots' },
              { id: 'night_markets', label: '🍜 Night Markets & Street Food' },
              { id: 'shopping', label: '🛍️ Shopping & Boutiques' },
              { id: 'nature', label: '⛰️ Nature & Scenery' },
              { id: 'history', label: '🏛️ History & Ancient Temples' },
              { id: 'wellness', label: '♨️ Hot Springs & Wellness' },
            ].map((style) => {
              const isSelected = formData.travelStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => toggleStyle(style.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 border ${
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

       {/* 5 & 6. Transit and Pacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5. Transit */}
          <section>
            <h2 className="text-lg font-semibold text-[#3E2723] mb-3">5. Primary Transit</h2>
            <div className="space-y-3">
              <div 
                onClick={() => setFormData({...formData, transit: 'mrt'})}
                className={`p-3 rounded-xl cursor-pointer border flex items-center gap-3 transition-all ${formData.transit === 'mrt' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
              >
                <div className="text-xl">🚆</div>
                <div>
                  <p className="font-semibold">MRT / Metro</p>
                  <p className={`text-xs ${formData.transit === 'mrt' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>Recommended for Taipei</p>
                </div>
              </div>
              <div 
                onClick={() => setFormData({...formData, transit: 'bus'})}
                className={`p-3 rounded-xl cursor-pointer border flex items-center gap-3 transition-all ${formData.transit === 'bus' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
              >
                <div className="text-xl">🚌</div>
                <div>
                  <p className="font-semibold">Public Bus & Walking</p>
                  <p className={`text-xs ${formData.transit === 'bus' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>For alleyway exploring</p>
                </div>
              </div>
              {/* ตัวเลือกใหม่: Taxi / Uber */}
              <div 
                onClick={() => setFormData({...formData, transit: 'taxi'})}
                className={`p-3 rounded-xl cursor-pointer border flex items-center gap-3 transition-all ${formData.transit === 'taxi' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
              >
                <div className="text-xl">🚕</div>
                <div>
                  <p className="font-semibold">Taxi / Uber</p>
                  <p className={`text-xs ${formData.transit === 'taxi' ? 'text-white/80' : 'text-[#8C7A6B]'}`}>Fast & convenient</p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Pacing */}
          <section>
            <h2 className="text-lg font-semibold text-[#3E2723] mb-3">6. Trip Pacing</h2>
            <div className="space-y-3">
              <div 
                onClick={() => setFormData({...formData, pacing: 'balanced'})}
                className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${formData.pacing === 'balanced' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">⏱️</div>
                  <p className="font-semibold">Balanced: 3-4 spots/day</p>
                </div>
                {formData.pacing === 'balanced' && (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
              <div 
                onClick={() => setFormData({...formData, pacing: 'slow'})}
                className={`p-3 rounded-xl cursor-pointer border flex items-center justify-between transition-all ${formData.pacing === 'slow' ? 'bg-[#A0522D] text-white border-transparent shadow-md' : 'bg-white border-[#D5C6B6] text-[#3E2723] hover:border-[#A0522D]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xl">⏰</div>
                  <p className="font-semibold">Slow Travel: 1-2 spots/day</p>
                </div>
                {formData.pacing === 'slow' && (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
              </div>
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
            className="w-full bg-[#A0522D] hover:bg-[#8A4525] text-white font-semibold text-lg py-4 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
            ✨ Generate Intelligent AI Trip (4D3N) <span className="ml-1">→</span>
          </button>
          <p className="text-center text-xs text-[#8C7A6B] mt-3">
            Auto-saved to "My Trips". Ready to export and share with travel companions.
          </p>
        </section>

      </div>
    </div>
  );
};

export default PreferenceForm;