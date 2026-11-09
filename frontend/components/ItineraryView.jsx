/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';

const ItineraryView = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#4A3F35] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- Header Section --- */}
        <div className="bg-[#F4ECE1] p-6 rounded-2xl border border-[#E2D6C8]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold tracking-wider text-[#A0522D] uppercase bg-white px-2 py-1 rounded-sm border border-[#D5C6B6]">Compute Optimized Itinerary</span>
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-sm">✨ Optimized (Smart Route v 2.2)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#3E2723]">Intelligent Itinerary: Taipei 4 Days 3 Nights <span className="text-lg font-normal text-[#8C7A6B]">(Taipei Autumn Explorer)</span></h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[#5D4A3E]">
                <span className="flex items-center gap-1">🗓️ 18 - 21 Sep 2025</span>
                <span className="flex items-center gap-1">📍 17 Curated Spots Planned</span>
                <span className="flex items-center gap-1">🚆 MRT + 10min Walk</span>
                <span className="flex items-center gap-1">⏱️ Pacing: Balanced (Slow Pace)</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button className="px-4 py-2 bg-white text-[#5D4A3E] text-sm font-medium rounded-lg border border-[#D5C6B6] hover:bg-gray-50 flex items-center justify-center gap-2">🔗 Share Trip</button>
              <button className="px-4 py-2 bg-white text-[#5D4A3E] text-sm font-medium rounded-lg border border-[#D5C6B6] hover:bg-gray-50 flex items-center justify-center gap-2">📄 Export PDF / Print</button>
              <button className="px-4 py-2 bg-[#4A6741] text-white text-sm font-medium rounded-lg hover:bg-[#3b5334] flex items-center justify-center gap-2">💬 Share to LINE</button>
              <button className="px-4 py-2 bg-[#A0522D] text-white text-sm font-medium rounded-lg hover:bg-[#8A4525] flex items-center justify-center gap-2">⚙️ Adjust Trip Constraints</button>
            </div>
          </div>
        </div>

        {/* --- Main Content Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Itinerary Timeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Day Tabs */}
            <div className="flex overflow-x-auto border-b border-[#D5C6B6] gap-2 pb-[-1px]">
              {['Day 1 (18 Sep)', 'Day 2 (19 Sep)', 'Day 3 (20 Sep)', 'Day 4 (21 Sep)'].map((day, idx) => (
                <button key={idx} className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${idx === 0 ? 'bg-[#A0522D] text-white' : 'bg-white text-[#8C7A6B] hover:bg-[#F4ECE1] border border-b-0 border-[#D5C6B6]'}`}>
                  {day}
                </button>
              ))}
            </div>

            {/* Daily Stats */}
            <div className="bg-[#FDF8F3] p-4 rounded-xl border border-[#E2D6C8] flex flex-wrap gap-6 items-center text-sm text-[#5D4A3E]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <div><p className="font-bold text-[#A0522D]">Day 1 Route Stats</p><p className="text-xs">Total Distance 16.2 km | Total Transit Time ~ 1h</p></div>
              </div>
              <div className="w-px h-8 bg-[#D5C6B6] hidden md:block"></div>
              <div className="flex items-center gap-2"><span>⛅</span><p className="text-xs">28°C (Feels like 32°C)<br/>Breeze</p></div>
              <div className="w-px h-8 bg-[#D5C6B6] hidden md:block"></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span><p className="text-xs font-semibold">MRT Red<br/>Line</p></div>
            </div>

            {/* Timeline List */}
            <div className="space-y-0">
              
              {/* Card 1: CKS Memorial Hall */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-6 h-6 bg-[#A0522D] text-white rounded-full flex items-center justify-center text-xs font-bold -left-[13px] top-4 shadow-sm border-2 border-[#FDFBF7]">1</div>
                <div className="bg-[#FDF8F3] border border-[#E2D6C8] rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-40 h-28 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                    <img src="https://www.travel.taipei/content/images/attractions/222959/1024x768_attractions-image-nh5ij7pepuajwbsqhfyu5q.jpg" alt="CKS" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[#A0522D] font-bold text-sm mb-1">09:00 - 11:30 (2.5 Hrs)</p>
                      <button className="text-gray-400 hover:text-gray-600">⋮</button>
                    </div>
                    <h3 className="text-lg font-bold text-[#3E2723] mb-1">Chiang Kai-shek Memorial Hall</h3>
                    <p className="text-xs text-[#5D4A3E] line-clamp-2 mb-3">Historic monument and landmark with blue-tiled octagonal roof, hourly changing of the guards ceremony, and historical exhibition hall.</p>
                    <div className="flex gap-3 text-xs text-[#8C7A6B]">
                      <span className="flex items-center gap-1">🎟️ Free Admission</span>
                      <span className="flex items-center gap-1">💂 Guard Change 11am</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit 1 */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-4 h-4 bg-white border-2 border-[#D5C6B6] rounded-full -left-[9px] top-1"></div>
                <div className="bg-white border border-[#E2D6C8] rounded-lg px-3 py-2 text-xs text-[#5D4A3E] flex items-center gap-2 w-fit shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> MRT Red Line (Dongmen Station) 5 min <span className="text-gray-300">|</span> 🚶 Walk 5 min
                </div>
              </div>

              {/* Card 2: Yongkang Street */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-6 h-6 bg-[#A0522D] text-white rounded-full flex items-center justify-center text-xs font-bold -left-[13px] top-4 shadow-sm border-2 border-[#FDFBF7]">2</div>
                <div className="bg-[#FDF8F3] border border-[#E2D6C8] rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-40 h-28 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSoimBt_en5O3QR0LHcCtWZYdHNmOAtT0SicNbK6hF51GA-IlsS6ndQht3&s=10" alt="Food" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[#A0522D] font-bold text-sm mb-1">12:00 - 14:00 (2 Hrs)</p>
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Lunch Recommendation</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#3E2723] mb-1">Yongkang Street Food Walk</h3>
                    <p className="text-xs text-[#5D4A3E] line-clamp-2 mb-3">World-renowned culinary avenue. Savory Xiao Long Bao at Din Tai Fung original store, followed by Smoothie House mango shaved ice.</p>
                    <div className="flex gap-3 text-xs text-[#8C7A6B]">
                      <span className="flex items-center gap-1">💸 Budget: ~$10 - $18 USD</span>
                      <span className="flex items-center gap-1">⏳ Est. 30 - 50 min wait</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit 2 */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-4 h-4 bg-white border-2 border-[#D5C6B6] rounded-full -left-[9px] top-1"></div>
                <div className="bg-white border border-[#E2D6C8] rounded-lg px-3 py-2 text-xs text-[#5D4A3E] flex items-center gap-2 w-fit shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> MRT Red Line (To Taipei 101/World Trade Center) 7 min
                </div>
              </div>

              {/* Card 3: Taipei 101 */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-6 h-6 bg-[#A0522D] text-white rounded-full flex items-center justify-center text-xs font-bold -left-[13px] top-4 shadow-sm border-2 border-[#FDFBF7]">3</div>
                <div className="bg-[#FDF8F3] border border-[#E2D6C8] rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-40 h-28 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                    <img src="https://www.bykido.com/cdn/shop/articles/Taipei_101_-_One_of_the_Highest_Observation_Decks_in_the_World_1200x1200.jpg?v=1602736225" alt="Taipei 101" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[#A0522D] font-bold text-sm mb-1">14:30 - 17:30 (3 Hrs)</p>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Pre-booked</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#3E2723] mb-1">Taipei 101 Observatory</h3>
                    <p className="text-xs text-[#5D4A3E] line-clamp-2 mb-3">Taiwan&apos;s tallest architectural marvel. High-speed elevators to the 89F indoor and 91F outdoor observation decks with 360° panoramic views.</p>
                    <div className="flex gap-3 text-xs text-[#8C7A6B]">
                      <span className="flex items-center gap-1">🎟️ Drop-in or 15:15</span>
                      <span className="flex items-center gap-1">❄️ Indoor air-conditioned</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit 3 */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-4 h-4 bg-white border-2 border-[#D5C6B6] rounded-full -left-[9px] top-1"></div>
                <div className="bg-white border border-[#E2D6C8] rounded-lg px-3 py-2 text-xs text-[#5D4A3E] flex items-center gap-2 w-fit shadow-sm">
                  🚶 Walking transit to Xiangshan Trailhead 17 min
                </div>
              </div>

              {/* Card 4: Xiangshan (Elephant Mountain) */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-6 h-6 bg-[#A0522D] text-white rounded-full flex items-center justify-center text-xs font-bold -left-[13px] top-4 shadow-sm border-2 border-[#FDFBF7]">4</div>
                <div className="bg-[#FDF8F3] border border-[#E2D6C8] rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-40 h-28 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                    <img src="https://www.travel.taipei/content/images/attractions/222129/1024x768_attractions-image-fjck6hgjre6acqcp2mhcqq.jpg" alt="Xiangshan" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[#A0522D] font-bold text-sm mb-1">18:00 - 19:30 (1.5 Hrs)</p>
                      <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">Golden Hour</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#3E2723] mb-1">Xiangshan (Elephant Mountain)</h3>
                    <p className="text-xs text-[#5D4A3E] line-clamp-2 mb-3">Beloved urban nature trail. Climb ~400 stone steps (15-20 min) for breathtaking sunset and glittering dusk skyline vistas over Taipei.</p>
                    <div className="flex gap-3 text-xs text-[#8C7A6B]">
                      <span className="flex items-center gap-1">⛰️ Trail: ~400 Stone Steps</span>
                      <span className="flex items-center gap-1">🌅 Golden Hour starts at 18:20</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transit 4 */}
              <div className="relative pl-10 pb-6 border-l-2 border-[#D5C6B6] ml-4">
                <div className="absolute w-4 h-4 bg-white border-2 border-[#D5C6B6] rounded-full -left-[9px] top-1"></div>
                <div className="bg-white border border-[#E2D6C8] rounded-lg px-3 py-2 text-xs text-[#5D4A3E] flex items-center gap-2 w-fit shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> MRT Red Line (Xiangshan to Shuanglian) 20 min
                </div>
              </div>

              {/* Card 5: Ningxia Night Market */}
              <div className="relative pl-10 pb-6 border-l-2 border-transparent ml-4">
                <div className="absolute w-6 h-6 bg-[#A0522D] text-white rounded-full flex items-center justify-center text-xs font-bold -left-[13px] top-4 shadow-sm border-2 border-[#FDFBF7]">5</div>
                <div className="bg-[#FDF8F3] border border-[#E2D6C8] rounded-xl p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                  <div className="w-full sm:w-40 h-28 bg-gray-200 rounded-lg shrink-0 overflow-hidden relative">
                    <img src="https://dynamic-media-cdn.tripadvisor.com/media/photo-o/33/3c/3d/04/caption.jpg?w=360&h=240&s=1" alt="Night Market" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[#A0522D] font-bold text-sm mb-1">20:00 - 21:30 (1.5 Hrs)</p>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Dinner & Explore</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#3E2723] mb-1">Ningxia Night Market</h3>
                    <p className="text-xs text-[#5D4A3E] line-clamp-2 mb-3">One of Taipei&apos;s most beloved night markets. Famous for oyster omelets, fried taro balls, and Michelin Bib Gourmand street food.</p>
                    <div className="flex gap-3 text-xs text-[#8C7A6B]">
                      <span className="flex items-center gap-1">🥢 Must-try: Fried Taro Balls</span>
                      <span className="flex items-center gap-1">🚶 Very crowded</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-4 border-t border-[#D5C6B6]">
               <button className="px-4 py-2 bg-white text-[#5D4A3E] text-sm font-medium rounded-lg border border-[#D5C6B6] hover:bg-gray-50 flex items-center gap-2">🔄 Recalculate Route</button>
               <button className="px-4 py-2 bg-white text-[#5D4A3E] text-sm font-medium rounded-lg border border-[#D5C6B6] hover:bg-gray-50 flex items-center gap-2">↕️ Reorder POIs</button>
               <button className="px-4 py-2 bg-[#A0522D] text-white text-sm font-medium rounded-lg hover:bg-[#8A4525] ml-auto flex items-center gap-2">+ Add Stop for This Day</button>
            </div>

          </div>

          {/* Right Column: Sidebar (Map & AI) */}
          <div className="space-y-6">
            
            {/* Map Section */}
            <div className="bg-white rounded-xl border border-[#E2D6C8] shadow-sm overflow-hidden flex flex-col h-[300px]">
              <div className="flex justify-between items-center p-3 border-b border-[#E2D6C8] bg-[#FDF8F3]">
                <h3 className="text-sm font-bold text-[#3E2723]">Route Map (Day 1) 🗺️</h3>
                <span className="text-xs text-[#A0522D] cursor-pointer">⛶ Real-time Stations</span>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[250px] bg-gray-200">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m50!1m12!1m3!1d68466.27989874371!2d121.48960460705014!3d25.057816711424266!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m35!3e0!4m3!3m2!1d25.1718856!2d121.4366733!4m5!1s0x3442a99db9a2a94d%3A0x43e9034292df69b2!2z4Lir4Lit4Lij4Liz4Lil4Li24LiB4LmA4LiI4Li14Lii4LiH4LmE4LiE4LmA4LiK4LmH4LiEIFpob25nemhlbmcgRGlzdHJpY3QsIFRhaXBlaSBDaXR5LCAxMDA!3m2!1d25.035501999999997!2d121.52018319999999!4m5!1s0x3442a983bf3ca4f9%3A0x52d54638cd5328d1!2sYongkang%20St%2C%20Da%E2%80%99an%20District%2C%20Taipei%20City%2C%20106!3m2!1d25.030765!2d121.529533!4m5!1s0x3442abb6da80a7ad%3A0xacc4d11dc963103c!2sTaipei%20101%20Shopping%20center%2C%20No.%2045%20%E8%99%9F%2C%20City%20Hall%20Rd%2C%20Xicun%20Village%2C%20Xinyi%20District%2C%20Taipei%20City%2C%20110!3m2!1d25.0341222!2d121.5640212!4m5!1s0x3442ab1950005a23%3A0x907b0e39bfb279f6!2sElephant%20Mountain%20Trail%2C%20Sanli%20Village%2C%20Xinyi%20District%2C%20Taipei%20City%2C%20110!3m2!1d25.027375!2d121.5709619!4m5!1s0x3442a96b56cf45c5%3A0xa2e6923fa27a10b4!2sTaipei%20Ningxia%20Night%20Market%2C%20Ningxia%20Rd%2C%20Xingming%20Village%2C%20Datong%20District%2C%20Taipei%20City%2C%20103!3m2!1d25.0566808!2d121.5153641!5e1!3m2!1sth!2stw!4v1792830300801!5m2!1sth!2stw"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                ></iframe>
              </div>
              <button className="w-full py-3 bg-[#A0522D] hover:bg-[#8A4525] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                🧭 Start Navigation (Open in Google Maps)
              </button>
            </div>

            {/* AI Trip Copilot Section */}
            <div className="bg-[#FDF8F3] rounded-xl border border-[#E2D6C8] shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#A0522D] flex items-center gap-2">✨ AI Trip Copilot</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Online</span>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-[#E2D6C8] text-xs text-[#5D4A3E] mb-4 shadow-sm">
                <span className="font-bold text-[#A0522D]">💡 AI Suggestion: </span> 
                At 14:00 local temperature is around 32°C. Visiting Taipei 101&apos;s air-conditioned observatory first before climbing Xiangshan at 17:00 ensures optimal lighting with less heat fatigue.
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button className="text-[10px] font-medium bg-white border border-[#D5C6B6] px-2 py-1 rounded-full text-[#5D4A3E] hover:bg-[#F4ECE1]">☕ Swap Stop 2 with Cafe Break</button>
                <button className="text-[10px] font-medium bg-white border border-[#D5C6B6] px-2 py-1 rounded-full text-[#5D4A3E] hover:bg-[#F4ECE1]">🚶 Shorten Hiking steps</button>
                <button className="text-[10px] font-medium bg-white border border-[#D5C6B6] px-2 py-1 rounded-full text-[#5D4A3E] hover:bg-[#F4ECE1]">☔ Rain contingency plan</button>
              </div>

              <div className="relative">
                <input type="text" placeholder="Type a prompt..." className="w-full pl-3 pr-10 py-2.5 text-xs border border-[#D5C6B6] rounded-lg focus:outline-none focus:border-[#A0522D]" />
                <button className="absolute right-1.5 top-1.5 w-7 h-7 bg-[#A0522D] text-white rounded-md flex items-center justify-center hover:bg-[#8A4525]">
                  ↑
                </button>
              </div>
            </div>

            {/* Footer Note */}
            <div className="flex justify-between text-[10px] text-[#8C7A6B] px-2">
              <span className="flex items-center gap-1">💳 EasyCard supported across all stops</span>
              <span>100% direct MRT accessibility</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryView;