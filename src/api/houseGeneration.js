export async function requestHouseGeneration(materials) {
    // =========================================================
    // TODO: 실제 AI 이미지 생성 API 요청
    //
    // 예:
    //
    // const response = await fetch('/api/house/generate', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //         materials
    //     })
    // });
    //
    // if (!response.ok) {
    //     throw new Error('집 생성 요청 실패');
    // }
    //
    // return await response.json();
    // =========================================================

    console.log('[TODO] HOUSE GENERATION REQUEST:', materials);

    return {
        success: true,
        materials
    };
}