'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';

type CategoryType = 'all' | 'nature' | 'culture' | 'food' | 'shopping' | 'cafe';

interface AttractionItem {
  id: string;
  name: string;
  district: string;
  category: CategoryType;
  description: string;
  imageUrl: string;
  mrt: string;
  matchScore: number;
  duration: string;
  tags: string[];
}

interface FilterOption {
  key: CategoryType;
  label: string;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { key: 'all', label: 'All Vibes' },
  { key: 'food', label: '🍜 Food & Night Market' },
  { key: 'culture', label: '🏛️ Historic & Culture' },
  { key: 'nature', label: '🌿 Nature & Views' },
  { key: 'cafe', label: '☕ Cafes & Design' },
  { key: 'shopping', label: '🛍️ Shopping' },
] as const;

const ATTRACTIONS_DATA: AttractionItem[] = [
  {
    id: 'att-1',
    name: 'Tamsui Golden Anchor & Old Street',
    district: 'Tamsui District',
    category: 'nature',
    description: 'Scenic waterfront trail along Tamsui River, historic fortresses, boutique coffee stops, and stunning sunset views.',
    imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Rny9Jn-J2V_dsgvGURGF-w9QBI4wcIO8VQZeqm6QaUiPBBUytrgUEkLLJHBXf-kEydaUyAiZrFA45kEoPQSdAWgBNPAKYS2FFbKhGa-VKVo7YPYMnWf5tRNISCgKffQcQv8bpdcAztjuoQ=s1360-w1360-h1020-rw',
    mrt: 'MRT Tamsui',
    matchScore: 98,
    duration: '2.5 hrs',
    tags: ['Waterfront', 'Sunset', 'Street Food']
  },
  {
    id: 'att-2',
    name: 'Chiang Kai-shek Memorial Hall',
    district: 'Zhongzheng District',
    category: 'culture',
    description: 'Iconic monumental landmark with expansive plazas, blue-tiled architecture, and hourly guard mount ceremonies.',
    imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9TxTpC8-wjvngpOehoGS6LFTG87Cd0Ib-5wOdymTcx84UIKJOXVz_TVtcmhT3BoI1RuxbdfBm8fX4qzcUd57MMNJ7GUzCuB5lOrX5fePCdd7shgnP_GWzNCn-UuMtYn6b9IgAkRbw=s1360-w1360-h1020-rw',
    mrt: 'MRT CKS Memorial Hall',
    matchScore: 96,
    duration: '1.5 hrs',
    tags: ['Historic', 'Architecture', 'Culture']
  },
  {
    id: 'att-3',
    name: 'Taipei 101 Observatory',
    district: 'Xinyi District',
    category: 'shopping',
    description: 'World-renowned architectural masterpiece featuring a high-speed elevator and 360-degree skyline observation deck.',
    imageUrl: 'https://res.klook.com/image/upload/w_750,h_469,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/k0ig84xvlhymyvlbsles.jpg',
    mrt: 'MRT Taipei 101',
    matchScore: 97,
    duration: '2.0 hrs',
    tags: ['Landmark', 'Skyline', 'Luxury Retail']
  },
  {
    id: 'att-4',
    name: 'Xiangshan (Elephant Mountain)',
    district: 'Xinyi District',
    category: 'nature',
    description: 'Short yet steep staircase trail leading to iconic boulder viewpoints overlooking the entire Taipei cityscape.',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5XryA6SdN51M5-DGh4wQNqqqipE9ntUdQAVHxGGNTIyh_5Aq-elz0w8Lf&s=10',
    mrt: 'MRT Xiangshan',
    matchScore: 95,
    duration: '2.0 hrs',
    tags: ['Hiking', 'Panoramic View', 'Photo Spot']
  },
  {
    id: 'att-5',
    name: 'Huashan 1914 Creative Park',
    district: 'Zhongzheng District',
    category: 'cafe',
    description: 'Historic sake brewery converted into contemporary art spaces, indie bookshops, craft workshops, and cozy cafes.',
    imageUrl: 'https://taiwanderers.com/wp-content/uploads/2024/04/Huashan-1914-Creative-Park-5-635x800.jpg',
    mrt: 'MRT Zhongxiao Xinsheng',
    matchScore: 93,
    duration: '2.5 hrs',
    tags: ['Artisan Cafes', 'Creative Boutiques', 'Design']
  },
  {
    id: 'att-6',
    name: 'Shilin Night Market',
    district: 'Shilin District',
    category: 'food',
    description: 'Taipei’s most celebrated night market bustling with legendary street food stalls, souvenirs, and local arcade games.',
    imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_Fe2Y8oGx9D2A18uZKrHZUDoniejFGELTGjR_7EleWMIA-e1UA00XdkCZ&s=10',
    mrt: 'MRT Jiantan',
    matchScore: 99,
    duration: '2.5 hrs',
    tags: ['Street Food', 'Night Market', 'Local Bites']
  },
  {
    id: 'att-7',
    name: 'Jiufen Old Street',
    district: 'Ruifang District',
    category: 'culture',
    description: 'Mountain village famous for lantern-lit alleyways, historic teahouses, handmade taro balls, and misty ocean panoramas.',
    imageUrl: 'https://girleatworld.net/wp-content/uploads/2019/03/jiufen-taiwan-teahouse.jpg',
    mrt: 'TRA Ruifang Station',
    matchScore: 99,
    duration: '3.5 hrs',
    tags: ['Heritage', 'Teahouse', 'Mountain View']
  },
  {
    id: 'att-8',
    name: 'Beitou Thermal Valley',
    district: 'Beitou District',
    category: 'nature',
    description: 'Natural sulfur hot spring valley surrounded by lush green parks, historic wooden bathhouses, and serene walkways.',
    imageUrl: 'https://www.kkday.com/en/blog/wp-content/uploads/Beitou2.webp',
    mrt: 'MRT Xinbeitou',
    matchScore: 92,
    duration: '1.5 hrs',
    tags: ['Hot Springs', 'Nature', 'Relaxation']
  }
];

export default function AttractionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  
  // โหลดค่าเริ่มต้นจาก localStorage (Lazy Initializer) ปลอดภัยต่อ TypeScript 100%
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['att-1'];
    try {
      const saved = window.localStorage.getItem('tripbot_pinned_ids');
      if (!saved) return ['att-1'];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : ['att-1'];
    } catch {
      return ['att-1'];
    }
  });

  // 3. ฟังก์ชันสลับสถานะ Pin พร้อมบันทึกลง localStorage
  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      try {
        localStorage.setItem('tripbot_pinned_ids', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save pinned spots to localStorage:', e);
      }
      return updated;
    });
  };

  const filteredAttractions = useMemo(() => {
    return ATTRACTIONS_DATA.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="w-full min-h-screen bg-[#F4F1EA] flex flex-col text-[#23272F]">
      <Header activeTab="attractions" />

      {/* HERO SECTION */}
      <section className="relative w-full bg-surface-container-low px-4 lg:px-8 py-8 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-xs">
                <span className="material-symbols-outlined text-[15px]">explore</span>
                Discover Destinations
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-2 tracking-tight">
                Top Attractions &amp; Curated Landmarks
              </h1>
              <p className="text-sm text-on-surface-variant mt-1">
                Explore handpicked spots, filter by vibes, and pin your favorites to plan your custom itinerary.
              </p>
            </div>

            {/* Pinned Counter & Quick Action */}
            <div className="flex items-center gap-3 bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant/30 shadow-xs">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                📌
              </span>
              <div>
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Pinned Spots</p>
                <p className="text-sm font-bold text-on-surface">{pinnedIds.length} Places Selected</p>
              </div>
              <Link
                href="/itinerary"
                className="ml-2 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-xs transition-colors"
              >
                Plan Itinerary ➔
              </Link>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search name, district, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-outline-variant/40 text-xs sm:text-sm focus:outline-hidden focus:border-primary shadow-2xs"
              />
            </div>

            {/* FILTER BUTTONS */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setSelectedCategory(filter.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === filter.key
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-white hover:bg-[#F2EEE6] text-[#5D6370] border border-outline-variant/30'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ATTRACTIONS GRID */}
      <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAttractions.map((spot) => {
            const isPinned = pinnedIds.includes(spot.id);
            return (
              <div
                key={spot.id}
                className="bg-surface-container-low hover:bg-surface-container rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 border border-outline-variant/30 flex flex-col group"
              >
                {/* Image Banner */}
                <div className="relative w-full h-48 bg-surface-container-highest overflow-hidden">
                  <img
                    src={spot.imageUrl}
                    alt={spot.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#E55A2B] text-white px-2 py-0.5 rounded-md text-[11px] font-bold shadow-xs">
                    ★ {spot.matchScore}% Match
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePin(spot.id)}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                      isPinned
                        ? 'bg-primary text-on-primary'
                        : 'bg-white/90 text-gray-500 hover:bg-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isPinned ? 'bookmark_added' : 'bookmark_border'}
                    </span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#7A7569] uppercase font-bold tracking-wider">
                      <span>{spot.district}</span>
                      <span>⏱️ {spot.duration}</span>
                    </div>

                    <h3 className="text-base font-bold text-on-surface mt-1 line-clamp-1">{spot.name}</h3>
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                      {spot.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-outline-variant/20 flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <span className="material-symbols-outlined text-[15px]">subway</span>
                      <span>{spot.mrt}</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {spot.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] font-medium text-on-surface-variant"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePin(spot.id)}
                      className={`w-full mt-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                        isPinned
                          ? 'bg-[#A95C38] text-white hover:bg-[#934D2D]'
                          : 'bg-primary text-on-primary hover:bg-primary/90'
                      }`}
                    >
                      <span>{isPinned ? '✓ Pinned to Trip' : '+ Pin to Trip'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAttractions.length === 0 && (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">search_off</span>
            <p className="text-sm font-semibold text-on-surface">No attractions found</p>
            <p className="text-xs text-on-surface-variant mt-1">Try adjusting your keywords or category filters.</p>
          </div>
        )}
      </main>
    </div>
  );
}