import Phaser from 'phaser';

export default class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
        this.currentScriptIndex = 0;
        this.isTyping = false;
        this.typingTimer = null;
    }

    preload() {
        this.load.image('cutscene1', 'assets/images/StartScene1.png');
        this.load.image('cutscene2', 'assets/images/StartScene2.png');
    }

    create() {
        const { width, height } = this.cameras.main;

        // 📜 수정된 대사 스크립트 (고양이 등장 X, 방황하는 스토리)
        this.scripts = [
            { bg: 'cutscene1', speaker: '어머니', text: "너 도대체 언제까지 방구석에서 빈둥거릴 거니?! 당장 나가!!", color: '#ff0055' },
            { bg: 'cutscene1', speaker: '주인공', text: "그렇게 나의 평화롭던 3년 차 백수 생활은 끝이 났다...", color: '#e0ffff' },
            { bg: 'cutscene2', speaker: '주인공', text: "가진 거라곤 낡은 배낭 하나뿐... 나는 무작정 숲으로 걸어갔다.", color: '#e0ffff' },
            { bg: 'cutscene2', speaker: '주인공', text: "숲이 너무 어둡다... 여기서 밤을 새워야 하는 건가?", color: '#e0ffff' },
            { bg: 'cutscene2', speaker: '주인공', text: "어? 저 멀리 뭔가 희미하게 빛나는 게 보이는데... 일단 가보자.", color: '#e0ffff' }
        ];

        // 1. 배경 이미지 설정
        this.bgImage = this.add.image(width / 2, height / 2, 'cutscene1');
        
        // 🌟 이미지 크기를 상하(height)에 딱 맞추기 (좌우 여백 허용)
        const scale = height / this.bgImage.height;
        this.bgImage.setScale(scale);

        // 2. 자막 대화창 패널
        const boxHeight = 130;
        this.dialogBox = this.add.graphics();
        this.dialogBox.fillStyle(0x050a15, 0.9);
        this.dialogBox.fillRoundedRect(40, height - boxHeight - 20, width - 80, boxHeight, 4);
        this.dialogBox.lineStyle(2, 0x00ffff, 1);
        this.dialogBox.strokeRoundedRect(40, height - boxHeight - 20, width - 80, boxHeight, 4);

        // 3. 화자 이름 텍스트
        this.speakerText = this.add.text(60, height - boxHeight - 10, '', {
            fontFamily: 'NeoDunggeunmo, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold'
        });

        // 4. 대사 내용 텍스트
        this.contentText = this.add.text(60, height - boxHeight + 25, '', {
            fontFamily: 'NeoDunggeunmo, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            wordWrap: { width: width - 150 }
        });

        // 5. 다음 안내 텍스트
        this.nextPrompt = this.add.text(width - 80, height - 40, '▶ F / Click', {
            fontFamily: 'NeoDunggeunmo, sans-serif',
            fontSize: '14px',
            color: '#00ffff'
        }).setOrigin(1, 1);

        this.tweens.add({ targets: this.nextPrompt, alpha: { from: 1, to: 0.2 }, duration: 600, yoyo: true, repeat: -1 });

        // 6. 스킵 버튼
        const skipBtn = this.add.text(width - 50, 30, '[ SKIP ]', {
            fontFamily: 'NeoDunggeunmo, sans-serif', fontSize: '16px', color: '#ff0055', backgroundColor: '#000000', padding: { x: 10, y: 5 }
        }).setInteractive({ useHandCursor: true }).setOrigin(1, 0);
        skipBtn.on('pointerdown', () => this.finishCutscene());

        // 7. 입력 이벤트
        this.input.on('pointerdown', () => this.handleNext());
        this.input.keyboard.on('keydown-F', () => this.handleNext());
        this.input.keyboard.on('keydown-SPACE', () => this.handleNext());
        this.input.keyboard.on('keydown-ENTER', () => this.handleNext());

        this.showScript(0);
    }

    showScript(index) {
        if (index >= this.scripts.length) {
            this.finishCutscene();
            return;
        }
        const data = this.scripts[index];
        this.bgImage.setTexture(data.bg);
        
        // 🌟 이미지가 바뀔 때마다 다시 높이(height) 스케일 맞추기
        const scale = this.cameras.main.height / this.bgImage.height;
        this.bgImage.setScale(scale);

        this.speakerText.setText(`[ ${data.speaker} ]`);
        this.speakerText.setColor(data.color);
        this.contentText.setText('');
        this.isTyping = true;

        if (this.typingTimer) this.typingTimer.remove();

        let charIndex = 0;
        const fullText = data.text;
        this.typingTimer = this.time.addEvent({
            delay: 40,
            callback: () => {
                this.contentText.setText(fullText.substring(0, charIndex + 1));
                charIndex++;
                if (charIndex >= fullText.length) this.isTyping = false;
            },
            repeat: fullText.length - 1
        });
    }

    handleNext() {
        if (this.isTyping) {
            this.typingTimer.remove();
            this.contentText.setText(this.scripts[this.currentScriptIndex].text);
            this.isTyping = false;
        } else {
            this.currentScriptIndex++;
            this.showScript(this.currentScriptIndex);
        }
    }

    finishCutscene() {
        this.cameras.main.fade(500, 0, 0, 0, false, (camera, progress) => {
            if (progress === 1) this.scene.start('BaseCampScene', { spawnFrom: 'Start' });
        });
    }
}