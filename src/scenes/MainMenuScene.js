import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        console.log('🏠 MainMenuScene create 실행');

        this.cameras.main.setBackgroundColor('#02060b');

        const mainMenuScreen = document.getElementById('main-menu-screen');
        const hudContainer = document.getElementById('hud-container');
        const questHud = document.getElementById('quest-hud-box');
        const alchemyDesk = document.getElementById('alchemy-desk-screen');
        const resetStorageButton = document.getElementById('reset-storage-btn');

        mainMenuScreen?.classList.remove('hidden');
        hudContainer?.classList.add('hidden');
        questHud?.classList.add('hidden');
        alchemyDesk?.classList.add('hidden');

        const startButton = document.getElementById('game-start-btn');
        const galleryButton = document.getElementById('gallery-btn');
        const hasSaveData = !!localStorage.getItem('cyberAlchemySave');

        console.log('▶ 게임 시작 버튼:', startButton);
        console.log('▦ 갤러리 버튼:', galleryButton);

        if (startButton) {
            const label = startButton.querySelector('.main-menu-btn-label');

            if (label) {
                label.innerText = hasSaveData ? '이어하기' : '게임 시작';
            } else {
                startButton.innerText = hasSaveData ? '▶ 이어하기' : '▶ 게임 시작';
            }

            startButton.onclick = () => {
                this.startGame();
            };
        }

        if (galleryButton) {
            galleryButton.onclick = () => {
                mainMenuScreen?.classList.add('hidden');
                this.scene.start('GalleryScene');
            };
        }

        if (resetStorageButton) {
            resetStorageButton.onclick = () => {
                this.resetLocalData();
            };
        }
    }

    // ⭐ 커스텀 Confirm 모달을 띄우고 Promise를 반환하는 헬퍼 메서드
    showCustomConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm-modal');
            const textEl = document.getElementById('custom-confirm-text');
            const okBtn = document.getElementById('custom-confirm-ok');
            const cancelBtn = document.getElementById('custom-confirm-cancel');

            if (!modal) {
                resolve(window.confirm(message)); // 예외 상황 방어
                return;
            }

            textEl.innerText = message;
            modal.classList.remove('hidden');

            const handleOk = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    async resetLocalData() {
        const message = 
            '게임 진행 데이터를 초기화하시겠습니까?\n\n' +
            '수집한 재료, 도감, 업그레이드, 복제기 상태, 작업대 상태가 초기화됩니다.\n' +
            '게스트 세션과 좋아요 기록은 유지됩니다.';

        // 브라우저 기본창 대신 커스텀 모달 호출
        const confirmed = await this.showCustomConfirm(message);

        if (!confirmed) return;

        // ==========================================
        // 1. 인게임 세이브 데이터만 삭제
        // ==========================================
        localStorage.removeItem('cyberAlchemySave');

        // ==========================================
        // 2. 현재 실행 중인 Phaser Registry도 초기화
        // ==========================================
        const gameDataKeys = [
            'wordInventory',
            'discoveredWords',
            'discoveredRecipes',
            'replicators',
            'upgrades',
            'discoveryOrder',
            'isWorkbenchCleaned',
            'evolutionPoints',
            'itemPositions',

            // 집 제작 진행 관련
            'houseMaterials',
            'houseBuildState',
            'houseGenerationResult',
            'generatedHouse',
            'comboCount'
        ];

        gameDataKeys.forEach((key) => {
            this.registry.remove(key);
        });

        // BaseCampScene의 초기화 블록이 다시 실행되도록
        this.registry.set('isInitialized', false);

        console.log('🧹 인게임 데이터 초기화 완료');
        console.log('🔐 Session 유지:', localStorage.getItem('wordShelterSessionId'));
        console.log('🔑 Token 유지:', !!localStorage.getItem('wordShelterAccessToken'));

        // 초기화 직후 페이지 새로고침으로 메뉴 상태 갱신
        location.reload();
    }

    startGame() {
        const mainMenuScreen = document.getElementById('main-menu-screen');
        const rawSaveData = localStorage.getItem('cyberAlchemySave');
        mainMenuScreen?.classList.add('hidden');
        this.cameras.main.fadeOut(350, 0, 0, 0);
        this.time.delayedCall(350, () => {
            if (rawSaveData) {
                console.log('💾 저장 데이터 발견 → 이어하기');
                this.scene.start('BaseCampScene', {
                    spawnFrom: 'Start',
                    continueGame: true
                });
                return;
            }
            console.log('🎬 저장 데이터 없음 → 새 게임 시작');
            this.scene.start('StartScene');
        });
    }
}