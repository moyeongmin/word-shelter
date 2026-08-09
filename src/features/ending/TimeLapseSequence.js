export default class TimeLapseSequence {
    constructor(scene) {
        this.scene = scene;

        // 개발 중에는 6000 정도로 테스트
        // 최종은 45000 추천
        this.duration = 8000;
    }

    play() {
        return new Promise((resolve) => {
            const uiContainer = document.getElementById('ui-container');

            if (!uiContainer) {
                resolve();
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'house-timelapse-overlay';

            overlay.innerHTML = `
                <div class="timelapse-sky">
                    <div class="timelapse-stars"></div>

                    <div class="timelapse-sun">☀</div>
                    <div class="timelapse-moon">☾</div>

                    <div class="timelapse-horizon"></div>
                </div>

                <div class="timelapse-day-counter">
                    DAY <span id="timelapse-day">1</span>
                </div>

                <div class="timelapse-characters">
                    <div class="timelapse-character">
                        <div class="temp-seat-ai">◉‿◉</div>
                        <span>AI</span>
                    </div>

                    <div class="timelapse-character">
                        <div class="temp-seat-player">●</div>
                        <span>YOU</span>
                    </div>
                </div>

                <!-- TODO:
                     실제 AI + 플레이어가 나란히 앉아있는 이미지/애니메이션으로 교체 -->

                <div class="timelapse-progress-wrap">
                    <div id="timelapse-percent" class="timelapse-percent">0%</div>

                    <div class="timelapse-house-progress">
                        <div
                            id="timelapse-progress-fill"
                            class="timelapse-progress-fill"
                        ></div>
                    </div>
                </div>

                <div id="timelapse-text" class="timelapse-text">
                    AI와 함께 보금자리 제작을 기다리는 중...
                </div>
            `;

            uiContainer.appendChild(overlay);

            const progressFill = overlay.querySelector('#timelapse-progress-fill');
            const percentText = overlay.querySelector('#timelapse-percent');
            const message = overlay.querySelector('#timelapse-text');
            const dayText = overlay.querySelector('#timelapse-day');

            const startedAt = Date.now();

            const messages = [
                [0.00, 'AI와 함께 보금자리 제작을 기다리는 중...'],
                [0.15, '재료의 특성을 분석하고 있습니다...'],
                [0.30, '기초 구조를 조립하고 있습니다...'],
                [0.45, '벽과 지붕이 만들어지고 있습니다...'],
                [0.60, '내부 공간을 구성하고 있습니다...'],
                [0.75, '수집한 재료의 특징을 반영하고 있습니다...'],
                [0.90, '마지막 마감 작업을 진행하고 있습니다...'],
                [0.98, 'AI: 거의 다 됐어.']
            ];

            let currentMessage = -1;

            const timer = window.setInterval(() => {
                const elapsed = Date.now() - startedAt;
                const ratio = Math.min(1, elapsed / this.duration);
                const percent = Math.floor(ratio * 100);

                if (progressFill) progressFill.style.width = `${percent}%`;
                if (percentText) percentText.innerText = `${percent}%`;

                // 총 7일이 흐르는 연출
                const day = Math.min(7, Math.floor(ratio * 7) + 1);
                if (dayText) dayText.innerText = day;

                let nextMessage = 0;

                messages.forEach((item, index) => {
                    if (ratio >= item[0]) nextMessage = index;
                });

                if (nextMessage !== currentMessage) {
                    currentMessage = nextMessage;

                    if (message) {
                        message.innerText = messages[nextMessage][1];
                    }
                }

                if (ratio >= 1) {
                    window.clearInterval(timer);

                    overlay.classList.add('fade-out');

                    window.setTimeout(() => {
                        overlay.remove();
                        resolve();
                    }, 800);
                }
            }, 100);
        });
    }
}