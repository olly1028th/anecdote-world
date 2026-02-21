import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useStats } from '../hooks/useStats';
import { formatCurrency, formatDate } from '../utils/format';

export default function ProfilePage() {
  const { profile, isDemo } = useAuth();
  const { updating, error: profileError, updateProfile } = useProfile();
  const stats = useStats();

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  // 편집 시작
  const handleEdit = () => {
    setNickname(profile?.nickname ?? '');
    setBio(profile?.bio ?? '');
    setEditing(true);
  };

  // 저장
  const handleSave = async () => {
    if (isDemo) {
      alert('데모 모드에서는 저장할 수 없습니다.');
      return;
    }
    await updateProfile({ nickname: nickname.trim(), bio: bio.trim() });
    setEditing(false);
  };

  // 취소
  const handleCancel = () => {
    setEditing(false);
  };

  // 이니셜 생성
  const initials = (profile?.nickname ?? '?').slice(0, 2).toUpperCase();

  // pinsByStatus 합계
  const totalPins =
    stats.pinsByStatus.visited +
    stats.pinsByStatus.planned +
    stats.pinsByStatus.wishlist;

  // 로딩 상태
  if (stats.loading) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="animate-pulse text-gray-400">프로필을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-8">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#FF6B6B] transition-colors no-underline"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        홈으로
      </Link>

      {/* ── 프로필 헤더 ── */}
      <section className="bg-white rounded-3xl p-6 shadow-md shadow-gray-200/50">
        <div className="flex items-start gap-5">
          {/* 아바타 */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0 ring-4 ring-[#FFD166]/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#FFD166] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-md">
              {initials}
            </div>
          )}

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0">
            {editing ? (
              /* ── 편집 모드 ── */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    닉네임
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    className="w-full border border-[#F0EEE6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/50"
                    placeholder="닉네임을 입력하세요"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    소개
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="w-full border border-[#F0EEE6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/50 resize-none"
                    placeholder="간단한 소개를 적어주세요"
                  />
                </div>

                {profileError && (
                  <p className="text-[#FF6B6B] text-xs">{profileError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={updating}
                    className="px-4 py-2 bg-[#FF6B6B] text-white text-sm font-medium rounded-xl hover:bg-[#e85d5d] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {updating ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              /* ── 읽기 모드 ── */
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#2D3436] truncate">
                    {profile?.nickname || '여행자'}
                  </h1>
                  {isDemo && (
                    <span className="px-2 py-0.5 bg-[#FFD166]/20 text-[#FF9F43] text-xs font-medium rounded-full">
                      Demo
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 mt-1">
                  {profile?.bio || '아직 소개가 없습니다.'}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  가입일:{' '}
                  {profile?.created_at
                    ? formatDate(profile.created_at)
                    : '-'}
                </p>

                <button
                  onClick={handleEdit}
                  className="mt-3 px-4 py-2 bg-[#F0EEE6] text-[#4A4A4A] text-sm font-medium rounded-xl hover:bg-[#e8e5db] transition-colors cursor-pointer"
                >
                  수정
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── 나의 통계 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-[#2D3436]">나의 통계</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 text-center">
            <span className="block text-xl mb-1">✈️</span>
            <p className="text-2xl font-bold text-[#2D3436]">
              {stats.completedCount}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">다녀온 여행</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 text-center">
            <span className="block text-xl mb-1">🌍</span>
            <p className="text-2xl font-bold text-[#2D3436]">
              {stats.countriesVisited.length}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">방문 국가</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 text-center">
            <span className="block text-xl mb-1">💰</span>
            <p className="text-2xl font-bold text-[#2D3436]">
              {formatCurrency(stats.totalSpent)}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">총 경비</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 text-center">
            <span className="block text-xl mb-1">📍</span>
            <p className="text-2xl font-bold text-[#2D3436]">{totalPins}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">등록한 핀</p>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-md shadow-gray-200/50 text-center">
            <span className="block text-xl mb-1">📸</span>
            <p className="text-2xl font-bold text-[#2D3436]">
              {stats.totalPhotos}
            </p>
            <p className="text-xs font-medium text-gray-400 mt-1">촬영한 사진</p>
          </div>
        </div>
      </section>

      {/* ── 방문 국가 ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-[#2D3436]">방문 국가</h2>
          <div className="h-[2px] flex-1 bg-[#F0EEE6]" />
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-md shadow-gray-200/50">
          {stats.countriesVisited.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.countriesVisited.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center px-3 py-1.5 bg-[#FFD166]/15 text-[#FF9F43] text-sm font-medium rounded-full"
                >
                  {country}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">
              아직 방문한 국가가 없어요
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
