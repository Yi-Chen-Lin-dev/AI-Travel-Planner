'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { HomeView } from '../components/HomeView';
import { Attraction, TripPlan } from '../types/trip';

// TODO: แทนที่ด้วย user_id จริงที่สร้างจากตาราง public.users ใน PostgreSQL (จนกว่าจะมีระบบ LINE Login)

const TEST_USER_ID = process.env.NEXT_PUBLIC_TEST_USER_ID || '50048c95-b993-4a00-b13e-8e82262d7ec8'; // LOCAL DEMO ONLY. Not authentication.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ฟังก์ชันช่วยแปลงค่าจากฟอร์มให้ตรงตาม Allowed Values ใน API_CONTRACT.md V2
const normalizeBudget = (val: string): 'low' | 'medium' | 'high' => {
  const v = val?.toLowerCase().trim();
  if (v === 'low' || v === 'budget') return 'low';
  if (v === 'high' || v === 'luxury') return 'high';
  return 'medium';
};

const normalizeTransportation = (val: string): 'walking' | 'public_transport' | 'driving' => {
  const v = val?.toLowerCase().trim();
  if (v === 'walking' || v === 'walk') return 'walking';
  if (v === 'driving' || v === 'car' || v === 'taxi') return 'driving';
  return 'public_transport';
};

const normalizePace = (val: string): 'relaxed' | 'normal' | 'fast' => {
  const v = val?.toLowerCase().trim();
  if (v === 'relaxed' || v === 'slow') return 'relaxed';
  if (v === 'fast' || v === 'packed') return 'fast';
  return 'normal';
};

const ALLOWED_INTERESTS = new Set([
  'food',
  'culture',
  'nature',
  'shopping',
  'entertainment',
]);

export default function Home() {
  const router = useRouter();

  // เก็บ draftTripId ไว้กรณีสร้างทริปสำเร็จแล้วแต่บันทึก preferences ไม่ผ่าน (ตาม Section 9 ของ API Contract)
  const [draftTripId, setDraftTripId] = useState<string | null>(null);

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['1'];
    try {
      const saved = window.localStorage.getItem('tripbot_pinned_ids');
      if (!saved) return ['1'];
      const data: unknown = JSON.parse(saved);
      if (!Array.isArray(data)) return ['1'];
      const result = data.filter((val): val is string => typeof val === 'string');
      return result.length > 0 ? result : ['1'];
    } catch {
      return ['1'];
    }
  });

  const handleTogglePin = (id: string) => {
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

  const mockAttractions: Attraction[] = [
    {
      id: '1',
      name: 'Tamsui Golden Anchor',
      districtName: 'Tamsui District',
      description: 'Beautiful waterfront trail perfect for evening runs, offering stunning sunset views towards Fisherman\'s Wharf.',
      imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9Rny9Jn-J2V_dsgvGURGF-w9QBI4wcIO8VQZeqm6QaUiPBBUytrgUEkLLJHBXf-kEydaUyAiZrFA45kEoPQSdAWgBNPAKYS2FFbKhGa-VKVo7YPYMnWf5tRNISCgKffQcQv8bpdcAztjuoQ=s1360-w1360-h1020-rw',
      mrtStation: 'MRT Tamsui',
      recommendedDuration: '2.0 hrs',
      matchScore: 98,
    },
    {
      id: '2',
      name: 'Jiufen Old Street',
      districtName: 'Ruifang District',
      description: 'Historic mountain town glowing with red lanterns, famous for traditional teahouses and taro balls.',
      imageUrl: 'https://girleatworld.net/wp-content/uploads/2019/03/jiufen-taiwan-teahouse.jpg',
      mrtStation: 'Bus from TRA Ruifang',
      recommendedDuration: '3.5 hrs',
      matchScore: 99,
    },
    {
      id: '3',
      name: 'Beitou Thermal Valley',
      districtName: 'Beitou District',
      description: 'Relaxing hot spring town. Grab a signature local black tea with lemon and enjoy the steamy, atmospheric scenery.',
      imageUrl: 'https://www.kkday.com/en/blog/wp-content/uploads/Beitou2.webp',
      mrtStation: 'MRT Xinbeitou',
      recommendedDuration: '1.5 hrs',
      matchScore: 94,
    },
    {
      id: '4',
      name: 'Huashan 1914 Creative Park',
      districtName: 'Zhongzheng District',
      description: 'Converted winery housing indie boutiques, pop-up exhibitions, and cozy cafes with lush green aesthetics.',
      imageUrl: 'https://taiwanderers.com/wp-content/uploads/2024/04/Huashan-1914-Creative-Park-5-635x800.jpg',
      mrtStation: 'MRT Zhongxiao Xinsheng',
      recommendedDuration: '3.0 hrs',
      matchScore: 91,
    }
  ];

  const mockPlan: TripPlan = {
    id: 'plan-1',
    title: 'Taipei 4D3N Explorer',
    subtitle: 'Highly requested routes around the city',
    durationDays: 4,
    durationNights: 3,
    spotsCount: 12,
    transitSummary: 'MRT Red & Blue Line',
    days: [
      {
        dayNumber: 1,
        dateStr: '18 Sep',
        routeStats: { totalDistanceKm: 18, totalTransitMinutes: 75, weather: 'Sunny', primaryMrtLine: 'Red Line' },
        stops: [
          {
            id: 'stop-1',
            title: 'Chiang Kai-shek Memorial Hall',
            description: 'Explore the grand architecture and beautiful gardens of this iconic historical landmark.',
            timeSlot: '09:00 - 10:30',
            duration: '1.5 hrs',
            imageUrl: 'https://lh3.googleusercontent.com/gps-cs-s/ANWiy9TxTpC8-wjvngpOehoGS6LFTG87Cd0Ib-5wOdymTcx84UIKJOXVz_TVtcmhT3BoI1RuxbdfBm8fX4qzcUd57MMNJ7GUzCuB5lOrX5fePCdd7shgnP_GWzNCn-UuMtYn6b9IgAkRbw=s1360-w1360-h1020-rw',
            badgeStatus: 'Morning Stroll',
            microTags: [{ icon: 'history', text: 'Historical' }],
            transitToNext: { description: '12 min via MRT Red Line' }
          },
          {
            id: 'stop-2',
            title: 'Taipei 101',
            description: 'Former tallest building in the world featuring a 360-degree observation deck and premium shopping.',
            timeSlot: '11:00 - 13:00',
            duration: '2 hrs',
            imageUrl: 'https://res.klook.com/image/upload/w_750,h_469,c_fill,q_85/w_80,x_15,y_15,g_south_west,l_Klook_water_br_trans_yhcmh3/activities/k0ig84xvlhymyvlbsles.jpg',
            badgeStatus: 'Highlight',
            microTags: [{ icon: 'storefront', text: 'Shopping' }, { icon: 'restaurant', text: 'Lunch' }],
            transitToNext: { description: '15 min walk' }
          },
          {
            id: 'stop-3',
            title: 'Xiangshan (Elephant Mountain)',
            description: 'A popular hiking trail offering the absolute best panoramic views of Taipei 101 and the city skyline.',
            timeSlot: '13:30 - 15:30',
            duration: '2 hrs',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5XryA6SdN51M5-DGh4wQNqqqipE9ntUdQAVHxGGNTIyh_5Aq-elz0w8Lf&s=10',
            badgeStatus: 'Nature & Views',
            microTags: [{ icon: 'hiking', text: 'Hiking' }, { icon: 'photo_camera', text: 'Photo Spot' }],
            transitToNext: { description: '20 min via MRT Red Line' }
          },
          {
            id: 'stop-4',
            title: 'Yongkang Street',
            description: 'A vibrant culinary destination famous for beef noodle soup, mango shaved ice, and boutique cafes.',
            timeSlot: '16:00 - 18:00',
            duration: '2 hrs',
            imageUrl: 'https://media.timeout.com/images/105921973/750/422/image.jpg',
            badgeStatus: 'Foodie Haven',
            microTags: [{ icon: 'ramen_dining', text: 'Local Food' }, { icon: 'coffee', text: 'Cafes' }],
            transitToNext: { description: '25 min via MRT Red Line' }
          },
          {
            id: 'stop-5',
            title: 'Shilin Night Market',
            description: 'One of the largest and most famous night markets in Taiwan, perfect for street food and local games.',
            timeSlot: '18:30 - 21:00',
            duration: '2.5 hrs',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_Fe2Y8oGx9D2A18uZKrHZUDoniejFGELTGjR_7EleWMIA-e1UA00XdkCZ&s=10',
            badgeStatus: 'Nightlife',
            microTags: [{ icon: 'tapas', text: 'Street Food' }, { icon: 'shopping_bag', text: 'Shopping' }]
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      <Header activeTab="home" />
      <HomeView 
        onSelectTab={(tab) => console.log('Tab selected:', tab)}
        onExploreAttraction={(attraction) => console.log('Explore:', attraction.name)}
        onSelectPlan={(plan) => console.log('Plan selected:', plan.title)}
        onGenerateTrip={async (prefs: {
          title?: string;
          destination?: string;
          startDate: string;
          endDate: string;
          budget: string;
          transportation: string;
          pace: string;
          interests: string[];
          dailyStartTime?: string;
          dailyEndTime?: string;
        }) => {
          try {
            // 1. ตรวจสอบวันที่เดินทาง (ไม่เก็บ days แยก ตามแนวทางของทีม แต่ตรวจสอบความถูกต้องของวันที่)
            if (!prefs.startDate || !prefs.endDate) {
              alert('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดการเดินทาง');
              return;
            }

            const start = new Date(prefs.startDate);
            const end = new Date(prefs.endDate);

            if (end < start) {
              alert('วันที่สิ้นสุดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้น');
              return;
            }

            const destinationName = (prefs.destination || 'Taipei').trim();
            const tripTitle = (prefs.title || `${destinationName} Trip`).slice(0, 150);

            // 2. ขั้นที่ 1: สร้าง Draft Trip ผ่าน POST /trips/ (ถ้ายังไม่เคยสร้างในรอบนี้)
            let activeTripId = draftTripId;

            if (!activeTripId) {
              const tripResponse = await fetch(`${API_BASE_URL}/trips/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: TEST_USER_ID,
                  title: tripTitle,
                  destination: destinationName,
                  start_date: prefs.startDate,
                  end_date: prefs.endDate,
                }),
              });

              if (!tripResponse.ok) {
                const errData = await tripResponse.json().catch(() => ({}));
                throw new Error(errData.detail || `Failed to create trip (${tripResponse.status})`);
              }

              const createdTrip = await tripResponse.json();
              activeTripId = createdTrip.trip_id;
              setDraftTripId(activeTripId);
              console.log('✅ Step 1 — Draft trip created:', createdTrip);
            }

            // 3. ขั้นที่ 2: บันทึก Preferences ผ่าน POST /preferences/ ตามสเปก API_CONTRACT.md V2
            const sanitizedInterests = (prefs.interests || [])
              .map((item) => item.toLowerCase().trim())
              .filter((item) => ALLOWED_INTERESTS.has(item));

            const apiPreferencePayload = {
              trip_id: activeTripId,
              budget: normalizeBudget(prefs.budget),
              transportation: normalizeTransportation(prefs.transportation),
              pace: normalizePace(prefs.pace),
              interests: sanitizedInterests,
            };

            const prefResponse = await fetch(`${API_BASE_URL}/preferences/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(apiPreferencePayload),
            });

            if (!prefResponse.ok) {
              const errData = await prefResponse.json().catch(() => ({}));
              throw new Error(errData.detail || `Failed to save preferences (${prefResponse.status})`);
            }

            const savedPrefResult = await prefResponse.json();
            console.log('✅ Step 2 — Preferences saved:', savedPrefResult);

            // 4. เก็บข้อมูลเสริมที่ V2 ยังไม่มีใน /trips/ (เช่น วันที่, destination, เวลาเริ่ม-จบวัน, pinned_spots) ไว้ใช้ต่อในหน้า Itinerary
            localStorage.setItem(
              'trip_preferences',
              JSON.stringify({
                ...apiPreferencePayload,
                title: tripTitle,
                destination: destinationName,
                start_date: prefs.startDate,
                end_date: prefs.endDate,
                daily_start_time: prefs.dailyStartTime || '09:00',
                daily_end_time: prefs.dailyEndTime || '21:00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei',
                pinned_spots: pinnedIds,
              })
            );

            // ล้างค่า draftTripId เมื่อบันทึกครบทั้ง 2 ขั้นตอนสำเร็จแล้ว
            setDraftTripId(null);

            // 5. ไปยังหน้ารายละเอียดทริปพร้อมส่ง trip_id จริง
            router.push(`/result?trip_id=${activeTripId}`);
          } catch (error: unknown) {
            console.error('❌ Error in trip creation / preference saving:', error);
            const message = error instanceof Error ? error.message : 'Please try again.';
            alert(`ไม่สามารถบันทึกข้อมูลทริปได้: ${message}`);
          }
        }}
        onTogglePin={handleTogglePin}
        attractions={mockAttractions}
        currentPlan={mockPlan}
        savedPlans={[mockPlan]}
        pinnedAttractionIds={pinnedIds}
        currency="NT$"
      />
    </div>
  );
}