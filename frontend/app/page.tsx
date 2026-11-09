'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { HomeView } from '../components/HomeView';
import { Attraction, TripPlan } from '../types/trip';

export default function Home() {
  const router = useRouter();

  // สร้าง State สำหรับเก็บไอดีสถานที่ที่ถูกปักหมุด โดยอ่านค่าเริ่มต้นจาก localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['1'];
    try {
      const saved = window.localStorage.getItem('tripbot_pinned_ids');
      if (!saved) return ['1'];
      const data: unknown = JSON.parse(saved);
      if (!Array.isArray(data)) return ['1'];
      const result: string[] = [];
      for (let i = 0; i < data.length; i++) {
        const val = data[i];
        if (typeof val === 'string') {
          result.push(val);
        }
      }
      return result.length > 0 ? result : ['1'];
    } catch {
      return ['1'];
    }
  });

  // ฟังก์ชันสลับสถานะ Pin/Unpin และบันทึกลง localStorage ทันที
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
        
        onGenerateTrip={(prefs: {
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
            // 1. ตรวจสอบและคำนวณ Trip Duration จากวันที่เลือกจริง (Validate days >= 1)
            if (!prefs.startDate || !prefs.endDate) {
              alert("กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดการเดินทาง");
              return;
            }

            const start = new Date(prefs.startDate);
            const end = new Date(prefs.endDate);

            if (end < start) {
              alert("วันที่สิ้นสุดต้องไม่เกิดขึ้นก่อนวันที่เริ่มต้น");
              return;
            }

            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const calculatedDays = diffDays + 1;

            if (calculatedDays < 1) {
              alert("จำนวนวันเดินทางต้องมีอย่างน้อย 1 วัน (days >= 1)");
              return;
            }

            // 2. จัดรูปแบบ Payload ให้ครบทั้ง 11 ฟิลด์ตามข้อกำหนดของ Issue #13 และ DATA_CONTRACT.md
            const tripId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : "b4f2c98a-78d1-419b-a31f-0e123456789a";

            const preferencePayload = {
              trip_id: tripId,
              destination: prefs.destination || "Taipei",
              start_date: prefs.startDate,
              days: calculatedDays,
              budget: prefs.budget,
              transportation: prefs.transportation,
              pace: prefs.pace,
              interests: prefs.interests,
              daily_start_time: prefs.dailyStartTime || "09:00",
              daily_end_time: prefs.dailyEndTime || "21:00",
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei",
              pinned_spots: pinnedIds
            };

            console.log("📅 Calculated Duration:", `${calculatedDays} Days, ${diffDays} Nights`);
            console.log("🚀 Payload Ready for POST /preferences/:", JSON.stringify(preferencePayload, null, 2));

            // 3. สั่งเปลี่ยนเส้นทางไปยังหน้ารายละเอียดทริป
            router.push(`/itinerary?trip_id=${tripId}`);
          } catch (error) {
            console.error("❌ Error saving preferences:", error);
            alert("Failed to save trip preferences. Please try again.");
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