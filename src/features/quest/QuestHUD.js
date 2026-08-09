export default class QuestHUD {
    constructor() {
        this.element = document.getElementById('quest-hud');

        if (!this.element) {
            this.element = document.createElement('div');
            this.element.id = 'quest-hud';
            this.element.className = 'quest-hud hidden';

            document.getElementById('ui-container')?.appendChild(this.element);
        }
    }

    showLostPartQuest(partFound = false) {
        if (!this.element) return;

        this.element.innerHTML = `
            <div class="quest-hud-type">EMERGENCY QUEST</div>

            <div class="quest-hud-title">
                잃어버린 AI 구동 부품
            </div>

            <div class="quest-hud-description">
                ${
                    partFound
                        ? '부품을 찾았다! BaseCamp의 작업대로 돌아가자.'
                        : '캠프 밖에서 AI의 핵심 구동 부품을 찾아오자.'
                }
            </div>

            <div class="quest-hud-time">
                ${
                    partFound
                        ? '✓ 부품 획득 완료'
                        : '예상 소요 2~3분'
                }
            </div>
        `;

        this.element.classList.remove('hidden');
    }

    hide() {
        this.element?.classList.add('hidden');
    }
}