export default class AICatAnimator {
    constructor() {
        this.timer = null;
        this.currentFrame = 1;
        this.direction = 1; // 1: 증가, -1: 감소 (왕복용)
        this.currentType = 'stand'; // 'stand', 'sit', 'sleep'
        
        // 타입별 최대 프레임 수 정의
        this.maxFrames = {
            stand: 5, // ai_cat_stand1 ~ 5
            sit: 3,   // ai_cat_sit1 ~ 3
            sleep: 3  // ai_cat_sleep1 ~ 3
        };
    }

    // 작업대를 열었을 때 호출
    start(imgElementId = 'ai-cat-face-img') {
        this.stop(); // 기존 타이머 청소

        const imgEl = document.getElementById(imgElementId);
        if (!imgEl) return;

        // 1. 랜덤으로 애니메이션 타입 선정 (stand, sit, sleep 중 하나)
        const types = ['stand', 'sit', 'sleep'];
        this.currentType = types[Math.floor(Math.random() * types.length)];
        this.currentFrame = 1;
        this.direction = 1;

        console.log(`🐱 AI 냥이 애니메이션 시작: [${this.currentType}] 모드`);

        // 2. 2초마다 프레임 전환 실행
        this.timer = setInterval(() => {
            const max = this.maxFrames[this.currentType];

            // 이미지 경로 설정 (경로 구조에 맞게 수정 가능)
            // 예시: assets/images/ai_cat_stand1.png
            imgEl.src = `assets/images/ai_cat_${this.currentType}${this.currentFrame}.png`;

            // 왕복 순환 로직 (1 -> max -> 1)
            this.currentFrame += this.direction;

            if (this.currentFrame >= max) {
                this.currentFrame = max;
                this.direction = -1; // 끝에 도달하면 감소로 전환
            } else if (this.currentFrame <= 1) {
                this.currentFrame = 1;
                this.direction = 1; // 시작에 도달하면 증가로 전환
            }
        }, 750); // 2초 간격
    }

    // 작업대를 닫았을 때 타이머 중지
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}