export default class AlchemyUI {
    constructor(scene) {
        this.scene = scene;
        this.root = document.getElementById('alchemy-desk-screen');

        if (!this.root) {
            console.error('[AlchemyUI] #alchemy-desk-screen을 찾을 수 없습니다.');
            return;
        }

        this.createBottomUI();
        this.cacheElements();
    }

    createBottomUI() {
        // 이미 만들어져 있으면 중복 생성 방지
        if (this.root.querySelector('.alchemy-bottom-area')) return;

        const bottomArea = document.createElement('div');
        bottomArea.className = 'alchemy-bottom-area';

        bottomArea.innerHTML = `
            <!-- AI 초상화 -->
            <div class="alchemy-ai-profile">
                <div class="alchemy-ai-image">

                    <!-- TODO: 실제 AI 이미지로 교체 -->
                    <div class="temp-ai-head">
                        <div class="temp-ai-antenna"></div>
                        <div class="temp-ai-eye left"></div>
                        <div class="temp-ai-eye right"></div>
                        <div class="temp-ai-mouth"></div>
                    </div>

                </div>

                <div class="alchemy-ai-name">
                    S.H.E.L.T.E.R AI
                </div>
            </div>

            <!-- AI 대사 -->
            <div class="alchemy-dialogue-box">
                <div class="alchemy-dialogue-speaker">
                    AI
                </div>

                <div id="alchemy-ai-dialogue">
                    필요한 재료를 조합하거나 복제해.
                    보금자리에 사용할 10개의 재료를 오른쪽 슬롯에 넣어 줘.
                </div>

                <button id="alchemy-ai-action" class="hidden"></button>
            </div>

            <!-- 집 재료 제출 -->
            <div class="house-submit-area">
                <div class="house-submit-title">
                    집 짓기 재료
                </div>

                <div id="house-material-slots" class="house-material-slots">
                    ${Array.from({ length: 10 }, (_, index) => `
                        <div class="house-material-slot" data-slot="${index}">
                            <span>${index + 1}</span>
                            <strong>+</strong>
                        </div>
                    `).join('')}
                </div>

                <div id="house-material-count" class="house-material-count">
                    0 / 10
                </div>

                <button id="submit-house-materials" class="house-submit-button" disabled>
                    재료 제출
                </button>
            </div>
        `;

        // loading-lock보다 앞에 삽입
        const loadingLock = document.getElementById('alchemy-loading-lock');

        if (loadingLock && loadingLock.parentElement === this.root) {
            this.root.insertBefore(bottomArea, loadingLock);
        } else {
            this.root.appendChild(bottomArea);
        }
    }

    cacheElements() {
        this.closeButton = document.getElementById('close-desk-btn');
        this.dialogue = document.getElementById('alchemy-ai-dialogue');
        this.actionButton = document.getElementById('alchemy-ai-action');
        this.loading = document.getElementById('alchemy-loading-lock');
    }

    open() {
        this.root?.classList.remove('hidden');
    }

    close() {
        this.root?.classList.add('hidden');
    }

    isOpen() {
        return this.root && !this.root.classList.contains('hidden');
    }

    onClose(callback) {
        if (!this.closeButton) return;

        this.closeButton.onclick = (e) => {
            e.stopPropagation();
            callback?.();
        };
    }

    setDialogue(text, actionLabel = null, callback = null) {
        if (this.dialogue) this.dialogue.innerText = text;

        if (actionLabel && callback && this.actionButton) {
            this.actionButton.innerText = actionLabel;
            this.actionButton.classList.remove('hidden');

            this.actionButton.onclick = (e) => {
                e.stopPropagation();
                callback();
            };
        } else if (this.actionButton) {
            this.actionButton.classList.add('hidden');
            this.actionButton.onclick = null;
        }
    }

    setLoading(active) {
        if (!this.loading) return;
        this.loading.classList.toggle('hidden', !active);
    }
}