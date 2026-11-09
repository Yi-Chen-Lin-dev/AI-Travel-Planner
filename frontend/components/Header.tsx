'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const pathname = usePathname();

  // ตรวจสอบสถานะว่าผู้ใช้อยู่ที่หน้าไหน
  const isHomeActive = pathname === '/' || activeTab === 'home';
  const isAttractionsActive = pathname.startsWith('/attractions') || activeTab === 'attractions';
  const isMyTripsActive = pathname.startsWith('/itinerary') || activeTab === 'my-trips';

  return (
    <header className="w-full bg-[#FBF9F4] border-b border-[#E7E2D7] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-lg shadow-xs">
            @
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-[#23272F]">TripBot AI</div>
            <div className="text-[10px] text-[#7A7569] font-semibold uppercase tracking-wider">AI Travel Planner</div>
          </div>
        </Link>

        {/* NAVIGATION LINKS */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium">
          
          {/* 1. ปุ่ม Home */}
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              isHomeActive && !isAttractionsActive && !isMyTripsActive
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-[#5D6370] hover:text-[#23272F] hover:bg-black/5'
            }`}
          >
            Home
          </Link>

          {/* 2. ปุ่ม Top Attractions (สีฟ้าเมื่ออยู่หน้า /attractions) */}
          <Link
            href="/attractions"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              isAttractionsActive
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-[#5D6370] hover:text-[#23272F] hover:bg-black/5'
            }`}
          >
            Top Attractions
          </Link>
          
          {/* 3. ปุ่ม Day Trips & Tours */}
          <Link href="/" className="text-[#5D6370] hover:text-[#23272F] hover:bg-black/5 px-3.5 py-1.5 rounded-lg text-sm transition-colors">
            Day Trips &amp; Tours
          </Link>

          {/* 4. ปุ่ม My Trips (สีฟ้าเมื่ออยู่หน้า /itinerary) */}
          <Link
            href="/itinerary"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              isMyTripsActive && !isAttractionsActive
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-[#5D6370] hover:text-[#23272F] hover:bg-black/5'
            }`}
          >
            My Trips
          </Link>

          {/* 5. ปุ่ม About Us */}
          <Link href="/" className="text-[#5D6370] hover:text-[#23272F] hover:bg-black/5 px-3.5 py-1.5 rounded-lg text-sm transition-colors">
            About Us
          </Link>
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center bg-[#F4F1EA] px-3 py-1.5 rounded-full border border-[#E7E2D7] text-xs text-gray-400 w-48">
            <span className="material-symbols-outlined text-[16px] mr-1">search</span>
            <span>Search destinations, POIs...</span>
          </div>

          <button 
            type="button"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Saved Trips / Sign In
          </button>
          
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary cursor-pointer shadow-xs">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>

      </div>
    </header>
  );
};