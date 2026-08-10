// src/features/sound/soundUtils.js

/**
 * 1. 사운드 에셋 프리로드 (로딩 씬이나 맵 씬의 preload에서 호출)
 */
export function preloadSounds(scene) {
    // BGM
    scene.load.audio('bgm_travel', 'assets/sounds/bgm_travel.mp3');
    scene.load.audio('bgm_ending', 'assets/sounds/bgm_ending.mp3');
    scene.load.audio('bgm_mainmenu', 'assets/sounds/bgm_mainmenu.mp3')

    // SFX (효과음)
    scene.load.audio('sfx_get_item', 'assets/sounds/sfx_get_item.mp3');
    scene.load.audio('sfx_mix', 'assets/sounds/sfx_mix.mp3');
}

/**
 * 2. 배경음악(BGM) 재생 (맵 이동 시 끊김 방지 기능 포함)
 */
export function playBGM(scene, key, volume = 0.3) {
    if (!scene || !scene.sound) return;

    const currentBGM = scene.registry.get('currentBGM');
    
    // 이미 같은 브금이 재생 중이면 무시 (ex. 숲 -> 동굴 이동 시 bgm_travel 유지)
    if (currentBGM === key) return;

    // 다른 브금이 켜져 있다면 끄기
    scene.sound.stopAll(); 

    // 새 브금 재생 (무한 반복)
    scene.sound.play(key, { loop: true, volume: volume });
    
    // 현재 재생 중인 브금 이름 저장
    scene.registry.set('currentBGM', key);
}

/**
 * 3. 효과음(SFX) 재생
 */
export function playSFX(scene, key, volume = 0.5) {
    if (!scene || !scene.sound) return;
    scene.sound.play(key, { volume: volume });
}

/**
 * 4. BGM 강제 종료
 */
export function stopBGM(scene) {
    if (!scene || !scene.sound) return;
    scene.sound.stopAll();
    scene.registry.set('currentBGM', null);
}