import QuestHUD from './QuestHUD';

export default class QuestManager {
    constructor(scene) {
        this.scene = scene;
        this.hud = new QuestHUD();
    }

    initialize() {
        const state = this.scene.registry.get('houseBuildState');

        if (state?.quest?.active && !state.quest.completed) {
            this.hud.showLostPartQuest(state.quest.partFound);
        }
    }

    start(id) {
        if (id !== 'lost-ai-part') return;

        const state = this.scene.registry.get('houseBuildState');

        if (!state) {
            console.error('❌ houseBuildState 없음');
            return;
        }

        state.quest.active = true;
        state.quest.completed = false;
        state.quest.startedAt = state.quest.startedAt || Date.now();
        state.quest.partFound = false;

        this.scene.registry.set('houseBuildState', state);

        console.log('🚀 [Quest] lost-ai-part 시작');

        this.hud.showLostPartQuest(false);
    }

    markPartFound() {
        const state = this.scene.registry.get('houseBuildState');

        if (!state?.quest?.active) return;

        state.quest.partFound = true;

        this.scene.registry.set('houseBuildState', state);

        this.hud.showLostPartQuest(true);
    }

    complete() {
        const state = this.scene.registry.get('houseBuildState');

        if (!state) return;

        state.quest.active = false;
        state.quest.completed = true;

        this.scene.registry.set('houseBuildState', state);

        this.hud.hide();
    }
}