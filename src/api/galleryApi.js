const API_BASE = 'https://ls4bj14ryk.execute-api.ap-northeast-2.amazonaws.com';

function normalizeImageUrl(url) {
    if (!url) return '';

    const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);
    return markdownMatch ? markdownMatch[1] : url;
}

async function getAccessToken() {
    let token = localStorage.getItem('wordShelterAccessToken');
    if (token) return token;

    const sessionId = localStorage.getItem('wordShelterSessionId');
    const body = {};

    if (sessionId) body.session_id = sessionId;

    const response = await fetch(`${API_BASE}/api/v1/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '게스트 인증 실패');
    }

    localStorage.setItem('wordShelterAccessToken', data.access_token);
    localStorage.setItem('wordShelterSessionId', data.session_id);

    return data.access_token;
}

export async function getGalleryHouses({ limit = 50, cursor = null } = {}) {
    const url = new URL(`${API_BASE}/api/v1/houses`);

    url.searchParams.set('limit', limit);
    url.searchParams.set('ready_only', 'true');

    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '갤러리 조회 실패');
    }

    data.items = (data.items || []).map((house) => ({
        ...house,
        image_url: normalizeImageUrl(house.image_url)
    }));

    return data;
}

export async function getHouseDetail(houseId) {
    const response = await fetch(`${API_BASE}/api/v1/houses/${houseId}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '집 상세 조회 실패');
    }

    data.image_url = normalizeImageUrl(data.image_url);

    return data;
}

export async function likeHouse(houseId) {
    const token = await getAccessToken();

    let response = await fetch(`${API_BASE}/api/v1/houses/${houseId}/like`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // 저장된 JWT가 만료된 경우 한 번 재로그인
    if (response.status === 401) {
        localStorage.removeItem('wordShelterAccessToken');

        const refreshedToken = await getAccessToken();

        response = await fetch(`${API_BASE}/api/v1/houses/${houseId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshedToken}`
            }
        });
    }

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '좋아요 요청 실패');
    }

    return data;
}