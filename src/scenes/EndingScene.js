import Phaser from 'phaser';

export default class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
        this.sleepAnimTimer = null; // 고양이 애니메이션 타이머 저장용
    }

    init() {
        this.generatedHouse = this.registry.get('generatedHouse');

        console.log('🏠 EndingScene generatedHouse:', this.generatedHouse);

        if (this.generatedHouse) {
            this.endingWords = this.generatedHouse.material_names || [];
            this.endingNumber = this.generatedHouse.ending_number ?? null;
            this.endingTitle = this.endingNumber !== null ? `ENDING #${this.endingNumber}` : '나만의 보금자리';
            this.endingDescription = this.generatedHouse.story || '당신이 모은 재료들로 하나뿐인 보금자리가 완성되었습니다.';
            this.houseImageUrl = this.normalizeImageUrl(this.generatedHouse.image_url);
        } else {
            console.warn('⚠️ generatedHouse가 없습니다.');

            this.endingWords = [];
            this.endingNumber = null;
            this.endingTitle = '나만의 보금자리';
            this.endingDescription = '당신이 모은 재료들로 하나뿐인 보금자리가 완성되었습니다.';
            this.houseImageUrl = null;
        }
    }

    normalizeImageUrl(url) {
        if (!url) return null;
        const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);
        if (markdownMatch) return markdownMatch[1];
        return url;
    }
    
    preload() {
        // 🌟 엔딩에서 사용할 고양이 잠자는 에셋 사전 로드 (경로는 프로젝트 에셋 구조에 맞춰주세요)
        this.load.image('ai_cat_sleep1', 'assets/images/ai_cat_sleep1.png');
        this.load.image('ai_cat_sleep2', 'assets/images/ai_cat_sleep2.png');
        this.load.image('ai_cat_sleep3', 'assets/images/ai_cat_sleep3.png');

        if (!this.houseImageUrl) return;

        if (!this.textures.exists('generated-house-image')) {
            console.log('🖼️ 생성 집 이미지 로드:', this.houseImageUrl);
            this.load.image('generated-house-image', this.houseImageUrl);
        }
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#080c10');

        console.log('🔥 EndingScene create 실행됨');

        const startScreen = document.getElementById('start-screen');
        const hudContainer = document.getElementById('hud-container');

        if (startScreen) startScreen.classList.add('hidden');
        if (hudContainer) hudContainer.classList.add('hidden');

        // 연출 전체 컨테이너
        this.introContainer = this.add.container(0, 0);

        // ==========================================
        // 🌟 로봇 대신 고양이 캐릭터 생성
        // ==========================================
        this.createCatCharacter(width, height);

        // ==========================================
        // AI 대사
        // ==========================================
        this.aiText = this.add.text(
            width / 2,
            height / 2 + 90,
            '',
            {
                fontSize: '22px',
                color: '#ffffff',
                align: 'center',
                lineSpacing: 8,
                wordWrap: { width: width * 0.75 }
            }
        )
        .setOrigin(0.5)
        .setAlpha(0);

        // ==========================================
        // 재료 표시 영역
        // ==========================================
        this.materialContainer = this.add.container(
            width / 2,
            height / 2 + 170
        );

        this.startEndingSequence();
    }

    // ==============================================
    // 🌟 임시 로봇 대신 고양이 캐릭터 생성 및 슬립 애니메이션(1>2>3>2>1 왕복)
    // ==============================================
    createCatCharacter(width, height) {
        const x = width / 2;
        const y = height / 2 - 80;

        this.aiContainer = this.add.container(x, y);

        // 고양이 이미지 스프라이트 생성 (초기값: sleep1)
        this.catSprite = this.add.image(0, 0, 'ai_cat_sleep1')
            .setScale(2.5) // 필요에 따라 크기 조절
            .setOrigin(0.5);

        this.aiContainer.add([this.catSprite]);
        this.aiContainer.setAlpha(0);

        // 🌟 750ms 기준 sleep1 -> sleep2 -> sleep3 -> sleep2 -> sleep1 왕복 순환 애니메이션
        let frameIndex = 1;
        let direction = 1; // 1: 증가, -1: 감소

        this.sleepAnimTimer = this.time.addEvent({
            delay: 750, // 750ms 간격
            callback: () => {
                if (!this.catSprite || !this.catSprite.active) return;
                
                frameIndex += direction;
                if (frameIndex >= 3) {
                    frameIndex = 3;
                    direction = -1; // 꼭대기에 도달하면 거꾸로
                } else if (frameIndex <= 1) {
                    frameIndex = 1;
                    direction = 1; // 바닥에 도달하면 다시 정방향
                }

                this.catSprite.setTexture(`ai_cat_sleep${frameIndex}`);
            },
            loop: true
        });
    }

    // ==============================================
    // 엔딩 연출 시작
    // ==============================================
    startEndingSequence() {
        this.tweens.add({
            targets: this.aiContainer,
            alpha: 1,
            duration: 1000,
            ease: 'Sine.easeOut',

            onComplete: () => {
                this.showMessage(
                    '...재료 수집이 끝난 모양이네.',
                    1800,
                    () => {
                        this.showMessage(
                            '어디 보자.\n네가 가져온 것들을 확인해 볼까?',
                            1800,
                            () => {
                                this.showMaterials();
                            }
                        );
                    }
                );
            }
        });
    }

    // ==============================================
    // AI 메시지 출력
    // ==============================================
    showMessage(message, duration, callback) {
        this.aiText.setText(message);

        this.tweens.add({
            targets: this.aiText,
            alpha: 1,
            duration: 300
        });

        this.time.delayedCall(duration, () => {
            if (callback) callback();
        });
    }

    // ==============================================
    // 10개 단어 표시
    // ==============================================
    showMaterials() {
        this.aiText.setText('이번 집에 사용할 재료는...');

        const words = this.endingWords.slice(0, 10);
        const spacingX = 125;
        const spacingY = 55;

        words.forEach((word, index) => {
            const row = Math.floor(index / 5);
            const column = index % 5;
            const x = (column - 2) * spacingX;
            const y = row * spacingY;

            const background = this.add.rectangle(x, y, 105, 38, 0x1c2b32)
                .setStrokeStyle(1, 0x607d8b)
                .setAlpha(0)
                .setScale(0.5);

            const text = this.add.text(x, y, word, { fontSize: '17px', color: '#ffffff' })
                .setOrigin(0.5)
                .setAlpha(0)
                .setScale(0.5);

            this.materialContainer.add([background, text]);

            this.time.delayedCall(index * 130, () => {
                this.tweens.add({
                    targets: [background, text],
                    alpha: 1,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 300,
                    ease: 'Back.easeOut'
                });
            });
        });

        this.time.delayedCall(words.length * 130 + 1500, () => {
            this.startHouseGeneration();
        });
    }

    // ==============================================
    // 집 생성 연출
    // ==============================================
    startHouseGeneration() {
        this.aiText.setText('음.. 이런 재료로 집을 지어 달라고?\n이상한 녀석이냥...');

        this.time.delayedCall(1700, () => {
            this.aiText.setText('......뭐, 상관없겠지.');
        });

        this.time.delayedCall(3000, () => {
            this.aiText.setText('좋아.\n네가 가져온 것들로 집을 만들어 줄게.');
        });

        this.time.delayedCall(4800, () => {
            this.tweens.add({
                targets: this.materialContainer,
                alpha: 0,
                duration: 500
            });

            this.showGenerating();
        });
    }

    // ==============================================
    // 생성 중 화면
    // ==============================================
    showGenerating() {
        let dotCount = 0;
        this.aiText.setText('Ai가 집을 짓는 중입니다');

        // 고양이 호흡/진동 효과 연출
        this.aiPulseTween = this.tweens.add({
            targets: this.aiContainer,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.loadingEvent = this.time.addEvent({
            delay: 400,
            callback: () => {
                dotCount = (dotCount + 1) % 4;
                this.aiText.setText('보금자리를 만드는 중입니다' + '.'.repeat(dotCount));
            },
            loop: true
        });

        this.time.delayedCall(4000, () => {
            this.loadingEvent.remove();
            this.aiPulseTween.stop();
            this.revealEnding();
        });
    }

    // ==============================================
    // 화면 전환
    // ==============================================
    revealEnding() {
        const { width, height } = this.scale;

        const black = this.add.rectangle(0, 0, width, height, 0x000000)
            .setOrigin(0)
            .setAlpha(0)
            .setDepth(100);

        this.tweens.add({
            targets: black,
            alpha: 1,
            duration: 1000,
            onComplete: () => {
                // 고양이 애니메이션 타이머 종료
                if (this.sleepAnimTimer) {
                    this.sleepAnimTimer.remove();
                }

                this.aiContainer.setVisible(false);
                this.aiText.setVisible(false);
                this.materialContainer.setVisible(false);

                this.createEndingScreen();

                this.tweens.add({
                    targets: black,
                    alpha: 0,
                    duration: 1300,
                    onComplete: () => {
                        black.destroy();
                    }
                });
            }
        });
    }

    // ==============================================
    // 최종 엔딩 화면
    // ==============================================
    createEndingScreen() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x101820).setOrigin(0);

        const horizontalPadding = Math.max(36, width * 0.055);
        const contentTop = Math.max(50, height * 0.11);
        const contentBottom = height - 105;
        const contentHeight = contentBottom - contentTop;
        const imageAreaWidth = width * 0.40;
        const columnGap = 40;
        const textAreaWidth = Math.max(260, width - horizontalPadding * 2 - imageAreaWidth - columnGap);

        const imageX = horizontalPadding + imageAreaWidth / 2;
        const textX = horizontalPadding + imageAreaWidth + columnGap;
        const contentCenterY = contentTop + contentHeight / 2;

        let houseDisplay;
        let houseTargetScale = 1;

        if (this.houseImageUrl && this.textures.exists('generated-house-image')) {
            houseDisplay = this.add.image(imageX, contentCenterY, 'generated-house-image');
            const maxImageWidth = imageAreaWidth;
            const maxImageHeight = contentHeight;

            houseTargetScale = Math.min(
                maxImageWidth / houseDisplay.width,
                maxImageHeight / houseDisplay.height
            );

            houseDisplay.setScale(houseTargetScale * 0.9);
            houseDisplay.setAlpha(0);
        } else {
            console.warn('⚠️ 실제 이미지가 없어 임시 집을 사용합니다.');
            houseDisplay = this.createTemporaryHouse(imageX, contentCenterY);
            houseTargetScale = Phaser.Math.Clamp(
                Math.min(imageAreaWidth / 430, contentHeight / 380),
                0.58,
                1
            );
            houseDisplay.setScale(houseTargetScale * 0.9);
            houseDisplay.setAlpha(0);
        }

        const titleFontSize = Phaser.Math.Clamp(Math.floor(width * 0.042), 30, 44);
        const title = this.add.text(textX, contentTop, this.endingTitle, {
            fontSize: `${titleFontSize}px`,
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'left',
            lineSpacing: 4,
            wordWrap: { width: textAreaWidth, useAdvancedWrap: true }
        })
        .setOrigin(0, 0)
        .setAlpha(0);

        const dividerY = contentTop + title.height + 16;
        const divider = this.add.rectangle(textX, dividerY, textAreaWidth, 2, 0x607d8b)
            .setOrigin(0, 0.5)
            .setAlpha(0);

        const scrollBoxY = dividerY + 20;
        const scrollBoxHeight = Math.max(150, contentBottom - scrollBoxY);

        const scrollBackground = this.add.rectangle(textX, scrollBoxY, textAreaWidth, scrollBoxHeight, 0x0b1218, 0.72)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x37474f)
            .setAlpha(0);

        const innerPadding = 18;
        const descriptionFontSize = Phaser.Math.Clamp(Math.floor(width * 0.019), 17, 21);

        const description = this.add.text(textX + innerPadding, scrollBoxY + innerPadding, this.endingDescription, {
            fontSize: `${descriptionFontSize}px`,
            color: '#d5d5d5',
            align: 'left',
            lineSpacing: 11,
            wordWrap: { width: textAreaWidth - innerPadding * 2 - 12, useAdvancedWrap: true }
        })
        .setOrigin(0, 0)
        .setAlpha(0);

        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(
            textX + innerPadding,
            scrollBoxY + innerPadding,
            textAreaWidth - innerPadding * 2 - 12,
            scrollBoxHeight - innerPadding * 2
        );
        const descriptionMask = maskShape.createGeometryMask();
        description.setMask(descriptionMask);

        const textStartY = scrollBoxY + innerPadding;
        const visibleTextHeight = scrollBoxHeight - innerPadding * 2;
        const maxScroll = Math.max(0, description.height - visibleTextHeight);
        let scrollOffset = 0;

        const scrollBarX = textX + textAreaWidth - 8;
        const scrollTrackHeight = scrollBoxHeight - 20;
        const scrollTrack = this.add.rectangle(scrollBarX, scrollBoxY + 10, 4, scrollTrackHeight, 0x263238, 0.9)
            .setOrigin(0.5, 0)
            .setAlpha(0);

        let scrollThumb = null;
        if (maxScroll > 0) {
            const visibleRatio = visibleTextHeight / description.height;
            const thumbHeight = Math.max(30, scrollTrackHeight * visibleRatio);
            scrollThumb = this.add.rectangle(scrollBarX, scrollBoxY + 10, 4, thumbHeight, 0x90a4ae, 1)
                .setOrigin(0.5, 0)
                .setAlpha(0);
        }

        const scrollZone = this.add.zone(textX, scrollBoxY, textAreaWidth, scrollBoxHeight)
            .setOrigin(0)
            .setInteractive({ useHandCursor: false });

        const updateScroll = () => {
            description.y = textStartY - scrollOffset;
            if (scrollThumb && maxScroll > 0) {
                const scrollRatio = scrollOffset / maxScroll;
                const maxThumbMove = scrollTrackHeight - scrollThumb.height;
                scrollThumb.y = scrollBoxY + 10 + maxThumbMove * scrollRatio;
            }
        };

        scrollZone.on('wheel', (pointer, deltaX, deltaY) => {
            if (maxScroll <= 0) return;
            scrollOffset = Phaser.Math.Clamp(scrollOffset + deltaY * 0.45, 0, maxScroll);
            updateScroll();
        });

        let isDragging = false;
        let lastPointerY = 0;

        scrollZone.on('pointerdown', pointer => {
            isDragging = true;
            lastPointerY = pointer.y;
        });

        this.input.on('pointerup', () => { isDragging = false; });
        this.input.on('pointermove', pointer => {
            if (!isDragging || maxScroll <= 0) return;
            const delta = lastPointerY - pointer.y;
            lastPointerY = pointer.y;
            scrollOffset = Phaser.Math.Clamp(scrollOffset + delta, 0, maxScroll);
            updateScroll();
        });

        let scrollGuide = null;
        if (maxScroll > 0) {
            scrollGuide = this.add.text(
                textX + textAreaWidth - 16,
                scrollBoxY + scrollBoxHeight - 10,
                '↕ 스크롤',
                { fontSize: '11px', color: '#78909c' }
            )
            .setOrigin(1, 1)
            .setAlpha(0);
        }

        const targetScaleX = houseDisplay.scaleX;
        const targetScaleY = houseDisplay.scaleY;

        houseDisplay.setScale(targetScaleX * 0.9, targetScaleY * 0.9);

        this.tweens.add({
            targets: houseDisplay,
            alpha: 1,
            scaleX: houseTargetScale,
            scaleY: houseTargetScale,
            duration: 1200,
            ease: 'Sine.easeOut'
        });

        this.time.delayedCall(400, () => {
            this.tweens.add({
                targets: [title, divider],
                alpha: 1,
                duration: 700
            });
        });

        this.time.delayedCall(900, () => {
            const fadeTargets = [scrollBackground, description, scrollTrack];
            if (scrollThumb) fadeTargets.push(scrollThumb);
            if (scrollGuide) fadeTargets.push(scrollGuide);

            this.tweens.add({
                targets: fadeTargets,
                alpha: 1,
                duration: 800,
                onComplete: () => {
                    this.createEndingButtons();
                }
            });
        });
    }

    createTemporaryHouse(x, y) {
        const container = this.add.container(x, y);
        const glow = this.add.circle(0, 0, 170, 0xffd180, 0.06);
        const wall = this.add.rectangle(0, 35, 270, 160, 0x795548).setStrokeStyle(4, 0x4e342e);
        const roof = this.add.triangle(0, -80, -165, 80, 0, -50, 165, 80, 0x37474f).setStrokeStyle(4, 0x263238);
        const door = this.add.rectangle(0, 70, 55, 90, 0x4e342e);
        const knob = this.add.circle(18, 70, 4, 0xffd54f);
        const leftWindow = this.add.rectangle(-80, 30, 50, 45, 0xffcc80).setStrokeStyle(5, 0x3e2723);
        const rightWindow = this.add.rectangle(80, 30, 50, 45, 0xffcc80).setStrokeStyle(5, 0x3e2723);
        const chimney = this.add.rectangle(90, -90, 32, 80, 0x616161);
        const goldDecoration = this.add.circle(0, -15, 15, 0xffd700);

        container.add([glow, chimney, wall, roof, leftWindow, rightWindow, door, knob, goldDecoration]);
        return container;
    }

    createEndingButtons() {
        const { width, height } = this.scale;
        const buttonY = height - 42;
        const buttonGap = Math.min(110, width * 0.12);

        const galleryButton = this.createButton(width / 2 - buttonGap, buttonY, '갤러리 보기', () => { this.goToGallery(); });
        const menuButton = this.createButton(width / 2 + buttonGap, buttonY, '메인 메뉴', () => { this.returnToMainMenu(); });

        galleryButton.setAlpha(0);
        menuButton.setAlpha(0);

        this.tweens.add({
            targets: [galleryButton, menuButton],
            alpha: 1,
            duration: 500
        });
    }

    createButton(x, y, label, callback) {
        const container = this.add.container(x, y);
        const background = this.add.rectangle(0, 0, 170, 44, 0x263238)
            .setStrokeStyle(2, 0x90a4ae)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(0, 0, label, { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);

        container.add([background, text]);

        background.on('pointerover', () => {
            background.setFillStyle(0x455a64);
            container.setScale(1.05);
        });

        background.on('pointerout', () => {
            background.setFillStyle(0x263238);
            container.setScale(1);
        });

        background.on('pointerdown', callback);

        return container;
    }

    returnToMainMenu() {
        this.scene.start('MainMenuScene');
    }

    goToGallery() {
        const houseId = this.generatedHouse?.house_id;
        const url = new URL('/gallery', window.location.origin);
        if (houseId) {
            url.searchParams.set('house', houseId);
        }
        console.log('🖼️ 갤러리 이동:', url.toString());
        window.location.href = url.toString();
    }
}