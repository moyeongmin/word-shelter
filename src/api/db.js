// src/api/db.js
export const combineWords = async (word1, word2) => {
    console.log(`[DB 요청] ${word1} + ${word2} 조합 중...`);
    
    // 실제 API 통신처럼 0.5초 딜레이 모방
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // 순서 상관없이 조합 인식 (A+B 나 B+A 나 같게 처리)
    const combo = [word1, word2].sort().join('+');
    
    // 우리가 테스트할 A + B 조합
    if (combo === 'A+B') return 'AB';
    
    return '실패한 찌꺼기'; // 등록되지 않은 조합일 경우
};