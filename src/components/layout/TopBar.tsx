'use client';

import { useState } from 'react';
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react';

interface TopBarProps {
  toggleSidebar: () => void;
}

export default function TopBar({ toggleSidebar }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Mock data - 나중에 Supabase Auth에서 가져올 것
  const user = {
    name: '김선생',
    email: 'teacher@aceenglish.com',
    academyName: 'ACE ENGLISH 강남점',
    avatar: null,
  };

  const notifications = [
    { id: 1, text: '고3-A반 영어 모의고사가 제출되었습니다', time: '5분 전', isNew: true },
    { id: 2, text: '고2-B반 숙제 채점이 완료되었습니다', time: '1시간 전', isNew: true },
    { id: 3, text: '새로운 학생이 등록되었습니다', time: '3시간 전', isNew: false },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2 w-80">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="검색... (학생, 반, 시험)"
              className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-full"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Academy Name - Desktop Only */}
          <div className="hidden lg:flex items-center px-4 py-2 bg-indigo-50 rounded-xl">
            <span className="text-sm font-medium text-indigo-600">
              {user.academyName}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.some((n) => n.isNew) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsNotificationOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">알림</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                          notification.isNew ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-900 mb-1">
                          {notification.text}
                        </p>
                        <p className="text-xs text-gray-500">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button className="w-full text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
                      모든 알림 보기
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.name.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">선생님</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">프로필</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left">
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">설정</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-100">
                    <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors text-left">
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">로그아웃</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
