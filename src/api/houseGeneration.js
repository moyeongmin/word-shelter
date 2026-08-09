const API_BASE = 'https://ls4bj14ryk.execute-api.ap-northeast-2.amazonaws.com';

let cachedGameData = null;

async function getAccessToken() {
    const savedToken = localStorage.getItem('wordShelterAccessToken');

    if (savedToken) return savedToken;

    const savedSessionId = localStorage.getItem('wordShelterSessionId');

    const body = {};
    if (savedSessionId) body.session_id = savedSessionId;

    const response = await fetch(`${API_BASE}/api/v1/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '게스트 로그인 실패');
    }

    localStorage.setItem('wordShelterAccessToken', data.access_token);
    localStorage.setItem('wordShelterSessionId', data.session_id);

    return data.access_token;
}

async function getGameData() {
    if (cachedGameData) return cachedGameData;

    const response = await fetch(`${API_BASE}/api/v1/game-data`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '재료 데이터 조회 실패');
    }

    cachedGameData = data;

    return data;
}

async function convertMaterialNamesToIds(materialNames) {
    const gameData = await getGameData();

    return materialNames.map((name) => {
        const material = gameData.materials.find((item) => item.name === name);

        if (!material) {
            throw new Error(`서버 재료 목록에서 "${name}"을 찾을 수 없습니다.`);
        }

        return material.material_id;
    });
}

export async function requestHouseGeneration(materials, options = {}) {
    if (!Array.isArray(materials) || materials.length !== 10) {
        throw new Error('집 제작에는 정확히 10개의 재료가 필요합니다.');
    }

    const materialIds = await convertMaterialNamesToIds(materials);

    if (new Set(materialIds).size !== 10) {
        throw new Error('집 제작 재료 10개는 모두 서로 달라야 합니다.');
    }

    const token = await getAccessToken();

    const initials = options.initials || 'WS';
    const comboCount = options.comboCount ?? 0;

    const response = await fetch(`${API_BASE}/api/v1/houses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            material_ids: materialIds,
            initials,
            combo_count: comboCount,
            generate: true
        })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '집 생성 요청 실패');
    }

    console.log('🏠 집 생성 요청 성공:', data);

    return data;
}

export async function getHouseGenerationResult(houseId) {
    const response = await fetch(`${API_BASE}/api/v1/houses/${houseId}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || '집 생성 결과 조회 실패');
    }

    return data;
}

export async function waitForHouseGeneration(houseId, interval = 4000, timeout = 180000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
        const house = await getHouseGenerationResult(houseId);

        console.log(`🏠 집 생성 상태: ${house.status}`);

        if (house.status === 'ready') return house;
        if (house.status === 'failed') throw new Error('집 생성에 실패했습니다.');

        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('집 생성 대기 시간이 초과되었습니다.');
}