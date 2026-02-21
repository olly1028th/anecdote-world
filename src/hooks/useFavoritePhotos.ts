import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** 홈 화면 갤러리에 표시할 favorite 사진 + 메타정보 */
export interface FavoritePhoto {
  id: string;
  url: string;
  caption: string;
  tripTitle: string;
  destination: string;
  date: string; // visited_at or created_at
}

/** 데모용 favorite 사진 데이터 */
const sampleFavorites: FavoritePhoto[] = [
  {
    id: 'fav-1',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop',
    caption: '신주쿠 교엔의 만개한 벚꽃',
    tripTitle: '도쿄 벚꽃 여행',
    destination: '도쿄, 일본',
    date: '2025-03-15',
  },
  {
    id: 'fav-2',
    url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop',
    caption: '센소지 야경',
    tripTitle: '도쿄 벚꽃 여행',
    destination: '도쿄, 일본',
    date: '2025-03-16',
  },
  {
    id: 'fav-3',
    url: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&h=400&fit=crop',
    caption: '도쿄 타워와 도시 야경',
    tripTitle: '도쿄 벚꽃 여행',
    destination: '도쿄, 일본',
    date: '2025-03-18',
  },
  {
    id: 'fav-4',
    url: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop',
    caption: '왓아룬 새벽사원',
    tripTitle: '방콕 맛집 투어',
    destination: '방콕, 태국',
    date: '2025-01-10',
  },
  {
    id: 'fav-5',
    url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&h=400&fit=crop',
    caption: '짜뚜짝 시장의 활기',
    tripTitle: '방콕 맛집 투어',
    destination: '방콕, 태국',
    date: '2025-01-11',
  },
];

export function useFavoritePhotos() {
  const [photos, setPhotos] = useState<FavoritePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPhotos(sampleFavorites);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // favorite 사진 + 핀/여행 정보 조인
      const { data, error } = await supabase
        .from('pin_photos')
        .select('id, url, caption, created_at, pin:pins!inner(name, visited_at, trip:trips(title, start_date))')
        .eq('is_favorite', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: FavoritePhoto[] = (data ?? []).map((row: any) => ({
        id: row.id,
        url: row.url,
        caption: row.caption,
        tripTitle: row.pin?.trip?.title ?? '',
        destination: row.pin?.name ?? '',
        date: row.pin?.visited_at ?? row.created_at,
      }));

      // 시간순 정렬
      mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setPhotos(mapped);
    } catch (err) {
      console.error('useFavoritePhotos error:', err);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return { photos, loading, refetch: fetchFavorites };
}
