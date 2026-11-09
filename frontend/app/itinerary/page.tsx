'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '../../components/Header';

// ฐานข้อมูลสถานที่จำลองแยกตามหมวดหมู่ (Interests / Vibes)
const POI_DATABASE = [
  // 1. Food & Night Markets
  {
    id: 'food-1',
    category: 'food',
    name: 'Shilin Night Market',
    district: 'Shilin District',
    description: 'Vibrant street food stalls, giant fried chicken, and traditional peanut ice cream rolls.',
    timeSlot: '18:30 - 21:00 (2.5 hrs)',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_Fe2Y8oGx9D2A18uZKrHZUDoniejFGELTGjR_7EleWMIA-e1UA00XdkCZ&s=10',
    mrt: 'MRT Jiantan',
    tags: [{ icon: 'ramen_dining', text: 'Street Food' }, { icon: 'nightlife', text: 'Night Market' }],
    transitNext: '15 min via MRT Red Line',
    mapCoords: { top: '20%', left: '42%' }
  },
  {
    id: 'food-2',
    category: 'food',
    name: 'Yongkang Street Food Haven',
    district: 'Da’an District',
    description: 'Iconic spot for authentic Taiwanese beef noodles, scallion pancakes, and fresh mango shaved ice.',
    timeSlot: '12:00 - 13:30 (1.5 hrs)',
    imageUrl: 'https://media.timeout.com/images/105921973/750/422/image.jpg',
    mrt: 'MRT Dongmen',
    tags: [{ icon: 'restaurant', text: 'Beef Noodles' }, { icon: 'icecream', text: 'Dessert' }],
    transitNext: '10 min walk',
    mapCoords: { top: '50%', left: '55%' }
  },
  {
    id: 'food-3',
    category: 'food',
    name: 'Ningxia Night Market',
    district: 'Datong District',
    description: 'Local favorite compact market famous for crispy taro balls and oyster omelets.',
    timeSlot: '19:00 - 20:30 (1.5 hrs)',
    imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9TxTpC8-wjvngpOehoGS6LFTG87Cd0Ib-5wOdymTcx84UIKJOXVz_TVtcmhT3BoI1RuxbdfBm8fX4qzcUd57MMNJ7GUzCuB5lOrX5fePCdd7shgnP_GWzNCn-UuMtYn6b9IgAkRbw=s1360-w1360-h1020-rw',
    mrt: 'MRT Shuanglian',
    tags: [{ icon: 'tapas', text: 'Local Snacks' }],
    transitNext: '12 min walk',
    mapCoords: { top: '38%', left: '38%' }
  },

  // 2. Culture & Historic Temples
  {
    id: 'culture-1',
    category: 'culture',
    name: 'Chiang Kai-shek Memorial Hall',
    district: 'Zhongzheng District',
    description: 'Grand historical monument with iconic blue-tiled octagonal roof and hourly guard changing ceremony.',
    timeSlot: '09:00 - 10:30 (1.5 hrs)',
    imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9TxTpC8-wjvngpOehoGS6LFTG87Cd0Ib-5wOdymTcx84UIKJOXVz_TVtcmhT3BoI1RuxbdfBm8fX4qzcUd57MMNJ7GUzCuB5lOrX5fePCdd7shgnP_GWzNCn-UuMtYn6b9IgAkRbw=s1360-w1360-h1020-rw',
    mrt: 'MRT CKS Memorial Hall',
    tags: [{ icon: 'account_balance', text: 'Historic' }, { icon: 'military_tech', text: 'Honor Guard' }],
    transitNext: '12 min via MRT Red Line',
    mapCoords: { top: '48%', left: '46%' }
  },
  {
    id: 'culture-2',
    category: 'culture',
    name: 'Longshan Temple',
    district: 'Wanhua District',
    description: 'Taipei’s most revered historic temple featuring ornate dragon carvings and lively local worship.',
    timeSlot: '10:00 - 11:30 (1.5 hrs)',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5XryA6SdN51M5-DGh4wQNqqqipE9ntUdQAVHxGGNTIyh_5Aq-elz0w8Lf&s=10',
    mrt: 'MRT Longshan Temple',
    tags: [{ icon: 'temple_buddhist', text: 'Ancient Temple' }],
    transitNext: '18 min via Bannan Line',
    mapCoords: { top: '52%', left: '35%' }
  },

  // 3. Nature & Scenic Views
  {
    id: 'nature-1',
    category: 'nature',
    name: 'Xiangshan (Elephant Mountain)',
    district: 'Xinyi District',
    description: 'Scenic hiking staircase offering world-famous panoramic viewpoint overlooking Taipei 101 skyline.',
    timeSlot: '16:30 - 18:30 (2.0 hrs)',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5XryA6SdN51M5-DGh4wQNqqqipE9ntUdQAVHxGGNTIyh_5Aq-elz0w8Lf&s=10',
    mrt: 'MRT Xiangshan',
    tags: [{ icon: 'hiking', text: 'Scenic Trail' }, { icon: 'wb_twilight', text: 'Sunset View' }],
    transitNext: '20 min via MRT Red Line',
    mapCoords: { top: '70%', left: '80%' }
  },
  {
    id: 'nature-2',
    category: 'nature',
    name: 'Tamsui Golden Anchor & Riverfront',
    district: 'Tamsui District',
    description: 'Relaxing coastal trail along Tamsui River, scenic pier strolls, and spectacular seaside sunset.',
    timeSlot: '15:30 - 18:00 (2.5 hrs)',
    imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Rny9Jn-J2V_dsgvGURGF-w9QBI4wcIO8VQZeqm6QaUiPBBUytrgUEkLLJHBXf-kEydaUyAiZrFA45kEoPQSdAWgBNPAKYS2FFbKhGa-VKVo7YPYMnWf5tRNISCgKffQcQv8bpdcAztjuoQ=s1360-w1360-h1020-rw',
    mrt: 'MRT Tamsui',
    tags: [{ icon: 'landscape', text: 'Waterfront' }, { icon: 'directions_walk', text: 'Sunset Promenade' }],
    transitNext: '35 min via MRT Red Line',
    mapCoords: { top: '15%', left: '22%' }
  },

  // 4. Shopping & Local Markets
  {
    id: 'shopping-1',
    category: 'shopping',
    name: 'Taipei 101 & Xinyi Shopping District',
    district: 'Xinyi District',
    description: 'Iconic architectural skyscraper with indoor observatory deck, surrounded by premier department stores.',
    timeSlot: '13:30 - 16:00 (2.5 hrs)',
    imageUrl: 'https://res.klook.com/image/upload/w_750,h_469,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/k0ig84xvlhymyvlbsles.jpg',
    mrt: 'MRT Taipei 101 / World Trade Center',
    tags: [{ icon: 'storefront', text: 'Luxury Shopping' }, { icon: 'apartment', text: 'Observatory Deck' }],
    transitNext: '15 min walk',
    mapCoords: { top: '65%', left: '72%' }
  },
  {
    id: 'shopping-2',
    category: 'shopping',
    name: 'Ximending Pedestrian Zone',
    district: 'Wanhua District',
    description: 'Youth fashion epicenter with boutique retail, anime stores, tattoo alleys, and bustling cosmetic shops.',
    timeSlot: '14:00 - 17:00 (3.0 hrs)',
    imageUrl: 'https://media.timeout.com/images/105921973/750/422/image.jpg',
    mrt: 'MRT Ximen',
    tags: [{ icon: 'shopping_bag', text: 'Fashion' }, { icon: 'palette', text: 'Pop Culture' }],
    transitNext: '12 min via MRT Green Line',
    mapCoords: { top: '44%', left: '32%' }
  },

  // 5. Entertainment & Modern Cafes
  {
    id: 'entertainment-1',
    category: 'entertainment',
    name: 'Huashan 1914 Creative Park',
    district: 'Zhongzheng District',
    description: 'Renovated winery housing indie cafes, artisan pop-up shops, photo spots, and design galleries.',
    timeSlot: '10:30 - 12:30 (2.0 hrs)',
    imageUrl: 'https://taiwanderers.com/wp-content/uploads/2024/04/Huashan-1914-Creative-Park-5-635x800.jpg',
    mrt: 'MRT Zhongxiao Xinsheng',
    tags: [{ icon: 'local_cafe', text: 'Indie Cafes' }, { icon: 'photo_camera', text: 'Creative Workshops' }],
    transitNext: '10 min walk',
    mapCoords: { top: '42%', left: '50%' }
  },
  {
    id: 'entertainment-2',
    category: 'entertainment',
    name: 'Songshan Cultural and Creative Park',
    district: 'Xinyi District',
    description: 'Eslite Spectrum bookstore, exhibition spaces, and lakeside wooden cafes surrounded by tranquil greenery.',
    timeSlot: '14:00 - 16:30 (2.5 hrs)',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_Fe2Y8oGx9D2A18uZKrHZUDoniejFGELTGjR_7EleWMIA-e1UA00XdkCZ&s=10',
    mrt: 'MRT Sun Yat-sen Memorial Hall',
    tags: [{ icon: 'book', text: 'Bookstore & Craft' }, { icon: 'coffee', text: 'Lakeside Cafe' }],
    transitNext: '15 min via MRT Blue Line',
    mapCoords: { top: '55%', left: '68%' }
  }
];

function ItineraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get('trip_id') || 'trip-sample-01';

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const simulatedDays = useMemo(() => {
    return [
      {
        dayNumber: 1,
        dateStr: '18 Sep',
        theme: 'Historical Heritage & Skyline Views',
        routeStats: { totalDistanceKm: 16.2, totalTransitMinutes: 65, weather: 'Sunny 29°C', primaryMrtLine: 'MRT Red Line' },
        stops: [POI_DATABASE[3], POI_DATABASE[1], POI_DATABASE[7], POI_DATABASE[5], POI_DATABASE[0]]
      },
      {
        dayNumber: 2,
        dateStr: '19 Sep',
        theme: 'Creative Culture & Street Fashion',
        routeStats: { totalDistanceKm: 12.8, totalTransitMinutes: 45, weather: 'Partly Cloudy 28°C', primaryMrtLine: 'MRT Blue Line' },
        stops: [POI_DATABASE[9], POI_DATABASE[8], POI_DATABASE[10], POI_DATABASE[2]]
      },
      {
        dayNumber: 3,
        dateStr: '20 Sep',
        theme: 'Riverside Sunset & Coastal Atmosphere',
        routeStats: { totalDistanceKm: 24.5, totalTransitMinutes: 85, weather: 'Pleasant Breeze 27°C', primaryMrtLine: 'MRT Tamsui Line' },
        stops: [POI_DATABASE[4], POI_DATABASE[6], POI_DATABASE[0]]
      },
      {
        dayNumber: 4,
        dateStr: '21 Sep',
        theme: 'Artisan Souvenirs & Cafe Relaxation',
        routeStats: { totalDistanceKm: 9.4, totalTransitMinutes: 35, weather: 'Sunny 30°C', primaryMrtLine: 'MRT Bannan Line' },
        stops: [POI_DATABASE[10], POI_DATABASE[7], POI_DATABASE[1]]
      }
    ];
  }, []);

  const currentDay = simulatedDays[selectedDayIndex] || simulatedDays[0];

  return (
    <div className="w-full min-h-screen bg-[#F4F1EA] flex flex-col relative text-[#23272F]">
      <Header activeTab="my-trips" />

      {/* TOP HERO BANNER */}
      <section className="relative w-full bg-surface-container-low px-4 lg:px-8 pt-6 pb-6 overflow-hidden shadow-xs border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-on-primary font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[15px]">add_circle</span>
                Home Trip Planner
              </span>
              <span className="text-outline-variant">•</span>
              <span className="text-primary font-semibold">AI Trip Planner & Creator 4.0</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-8 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                Intelligent Trip Creator — <span className="text-primary">Automated Routing & Scheduling</span>
              </h1>
              <p className="text-sm text-on-surface-variant max-w-3xl">
                Simulated optimal itinerary with curated spots, real-time transit times, and localized sequencing to minimize travel fatigue.
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <div className="bg-surface-container px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-xs border border-outline-variant/30">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-on-secondary shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">AI Calculation Engine</p>
                  <p className="text-sm font-semibold text-on-surface">Balanced & Smart Transit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN ITINERARY WORKSPACE */}
      <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ซ้าย (7 ส่วน): ตารางวัน + รายการสถานที่ */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* แถบเลือกวัน 1-4 */}
            <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center gap-2 overflow-x-auto shadow-xs border border-outline-variant/30">
              {simulatedDays.map((d, index) => {
                const isActive = selectedDayIndex === index;
                return (
                  <button
                    key={d.dayNumber}
                    onClick={() => setSelectedDayIndex(index)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all text-center whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Day {d.dayNumber} ({d.dateStr})
                  </button>
                );
              })}
            </div>

            {/* กล่องสรุปสถิติประจำวัน (Day Route Stats) */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">route</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-surface">Day {currentDay.dayNumber} Route Stats</span>
                  <span className="text-xs text-on-surface-variant">
                    Total Distance <strong className="text-on-surface">{currentDay.routeStats.totalDistanceKm} km</strong> | Total Transit ~{currentDay.routeStats.totalTransitMinutes} min
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs bg-surface-container px-3 py-1.5 rounded-lg text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-[16px] text-tertiary">wb_sunny</span>
                <span>{currentDay.routeStats.weather}</span>
                <span className="text-outline-variant">•</span>
                <span className="text-primary font-semibold">{currentDay.routeStats.primaryMrtLine}</span>
              </div>
            </div>

            {/* ไทม์ไลน์จุดแวะ (Simulated POI Stops) */}
            <div className="relative pl-7 sm:pl-8 space-y-4">
              <div className="absolute left-3.5 sm:left-4 top-4 bottom-4 w-0.5 bg-outline-variant/50 -translate-x-1/2" />

              {currentDay.stops.map((stop, idx) => (
                <React.Fragment key={stop.id}>
                  <div className="relative group">
                    <div className="w-6 h-6 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center shadow-xs absolute -left-7 sm:-left-8 top-4">
                      {idx + 1}
                    </div>

                    <div className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 shadow-xs transition-all duration-200 border border-outline-variant/30">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-36 h-28 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
                          <img
                            src={stop.imageUrl}
                            alt={stop.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant text-[11px] font-bold">
                                {stop.timeSlot}
                              </span>
                              <span className="text-[11px] text-outline font-medium">
                                {stop.district}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-on-surface mt-1">{stop.name}</h3>
                            <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                              {stop.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 pt-2 mt-2 text-xs text-on-surface-variant flex-wrap border-t border-outline-variant/20">
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <span className="material-symbols-outlined text-[14px]">subway</span>
                              {stop.mrt}
                            </span>
                            {stop.tags.map((t, tIdx) => (
                              <span key={tIdx} className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-outline">{t.icon}</span>
                                <span>{t.text}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {stop.transitNext && idx < currentDay.stops.length - 1 && (
                    <div className="relative py-1 flex items-center gap-2 text-xs text-on-surface-variant">
                      <div className="px-3 py-1 rounded-lg bg-surface-container flex items-center gap-1.5 shadow-2xs border border-outline-variant/30">
                        <span className="material-symbols-outlined text-[16px] text-primary">directions_subway</span>
                        <span>{stop.transitNext}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ปุ่มแก้ไขความต้องการ */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-4">
              <span className="text-xs text-on-surface-variant font-medium">
                Want to adjust budget, pace, or travel vibe?
              </span>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                Edit Trip Preferences
              </button>
            </div>
          </div>

          {/* ขวา (5 ส่วน): Route Map */}
          <div className="lg:col-span-5 flex flex-col space-y-4 lg:sticky lg:top-24">
            <div className="bg-surface-container-low rounded-xl p-3 shadow-xs border border-outline-variant/30">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-on-surface">Route Map (Day {currentDay.dayNumber})</span>
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Edit in Planner ➔
                </button>
              </div>

              <div className="relative w-full h-[340px] rounded-lg overflow-hidden shadow-inner bg-cover bg-center border border-outline-variant/20"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDyM6_U5yRkTdnUTEZuPPmYOzTeGLVM0tS6bwUK0BH6D9kew7BvY6eGt3geAcM9c6F2PLBdk8DNP4h1biQ_OaK6_nwLznu92crzLsV5x494L30atDo4qC61obB6nsCfPeNFDRknaRv_855XHDgH9f5OLkTW006mgfqJeO02LKNBsXrzHGRywxu8CxymmJGiP-AsLAVnQul5sMw5IpiCaqvQ9NhzBjdKdfjEMNC24UuH5_fSlgZHNhY')" }}
              >
                <div className="absolute inset-0 bg-inverse-surface/10 pointer-events-none" />

                {currentDay.stops.map((stop, sIdx) => (
                  <div
                    key={stop.id}
                    className="absolute flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-xs text-on-surface text-[10px] font-bold border border-outline-variant/30 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-110 cursor-pointer"
                    style={{ top: stop.mapCoords.top, left: stop.mapCoords.left }}
                    title={stop.name}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[9px]">
                      {sIdx + 1}
                    </span>
                    <span className="truncate max-w-[85px]">{stop.name}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <a
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-xs active:scale-98 cursor-pointer"
                  href="https://maps.google.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="material-symbols-outlined text-[16px]">explore</span>
                  <span>Open in Google Maps Navigation</span>
                </a>
              </div>
            </div>

            {/* AI Trip Copilot Box */}
            <div className="bg-surface-container-low rounded-xl p-4 shadow-xs border border-outline-variant/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  AI Smart Advisory
                </span>
                <span className="text-[10px] font-bold text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-full">
                  SYNCED
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                💡 <strong className="text-on-surface font-semibold">Route Tip:</strong> Day {currentDay.dayNumber} focuses on <em>{currentDay.theme}</em>. Sequential routing prioritizes {currentDay.routeStats.primaryMrtLine} corridors to keep average station transfers under 12 minutes.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// ครอบ Suspense เพื่อไม่ให้เกิด Error useSearchParams() prerender
export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-on-surface-variant">Loading trip itinerary...</span>
        </div>
      </div>
    }>
      <ItineraryContent />
    </Suspense>
  );
}