// src/features/player/playerUtils.js

/**
 * 1. 플레이어 에셋 프리로드
 */
export function preloadPlayerAssets(scene) {
    scene.load.image('char_stand', 'assets/images/char_stand.png');
    scene.load.image('char_walk1', 'assets/images/char_walk3.png');
    scene.load.image('char_walk2', 'assets/images/char_walk4.png');
    scene.load.image('char_walk_front1', 'assets/images/char_walk_front1.png');
    scene.load.image('char_walk_front2', 'assets/images/char_walk_front2.png');
}

/**
 * 2. 플레이어 애니메이션 등록
 */
export function createPlayerAnims(scene) {
    if (!scene.anims.exists('walk_up')) {
        scene.anims.create({
            key: 'walk_up',
            frames: [{ key: 'char_walk1' }, { key: 'char_walk2' }],
            frameRate: 6,
            repeat: -1
        });
    }

    if (!scene.anims.exists('walk_down')) {
        scene.anims.create({
            key: 'walk_down',
            frames: [{ key: 'char_walk_front1' }, { key: 'char_walk_front2' }],
            frameRate: 6,
            repeat: -1
        });
    }
}

/**
 * 3. 이동 및 대각선 반전 애니메이션 제어
 */
export function updatePlayerMovement(player, keys, speed) {
    if (!player || !player.body) return;

    let vx = 0;
    let vy = 0;

    if (keys.A?.isDown) vx = -speed;
    else if (keys.D?.isDown) vx = speed;

    if (keys.W?.isDown) vy = -speed;
    else if (keys.S?.isDown) vy = speed;

    player.body.setVelocity(vx, vy);

    if (!player.lastFacing) player.lastFacing = 'down';

    // 🏃‍♂️ 이동 중인 경우
    if (vx !== 0 || vy !== 0) {
        // 1. 북쪽(W) 이동 관련 (NW, NE)
        if (vy < 0) {
            player.anims.play('walk_up', true);
            player.lastFacing = 'up';

            if (vx > 0) {
                // W + D (NE 방향) -> 좌우 반전
                player.setFlipX(true);
            } else if (vx < 0) {
                // W + A (NW 방향) -> 원본
                player.setFlipX(false);
            }
        } 
        // 2. 남쪽(S) 이동 관련 (SW, SE)
        else if (vy > 0) {
            player.anims.play('walk_down', true);
            player.lastFacing = 'down';

            if (vx < 0) {
                // S + A (SW 방향) -> 좌우 반전
                player.setFlipX(true);
            } else if (vx > 0) {
                // S + D (SE 방향) -> 원본
                player.setFlipX(false);
            }
        } 
        // 3. 좌/우 단독 이동 (A 또는 D만 눌렀을 때)
        else {
            if (player.lastFacing === 'up') {
                player.anims.play('walk_up', true);
                if (vx > 0) player.setFlipX(true);  // NE 바라보기
                else player.setFlipX(false);        // NW 바라보기
            } else {
                player.anims.play('walk_down', true);
                if (vx < 0) player.setFlipX(true);  // SW 바라보기
                else player.setFlipX(false);        // SE 바라보기
            }
        }
    } 
    // 🧍‍♂️ 멈춰선 경우 (Idle)
    else {
        player.anims.stop();
        if (player.lastFacing === 'up') {
            player.setTexture('char_stand');
            // 이동할 때 설정된 setFlipX 상태가 그대로 유지되어 멈춘 방향을 바라봅니다.
        } else {
            player.setTexture('char_walk_front1');
            // 이동할 때 설정된 setFlipX 상태가 그대로 유지되어 멈춘 방향을 바라봅니다.
        }
    }
}

/**
 * 플레이어 히트박스 및 스케일 통합 설정 (375x666 기준)
 */
export function setupPlayerHitbox(player, scale = 0.25) {
    if (!player || !player.body) return;

    // 1. 스케일 적용
    player.setScale(scale);
    player.body.setCollideWorldBounds(true);

    // 2. 원본 크기(375x666) 기준 히트박스 크기 설정 (발밑 영역)
    const hitBoxWidth = 150;  // 발 폭
    const hitBoxHeight = 80;  // 발 높이
    player.body.setSize(hitBoxWidth, hitBoxHeight);

    // 3. 발밑 중앙으로 오프셋 이동
    const offsetX = (375 - hitBoxWidth) / 2; // 112.5px (좌우 정중앙)
    const offsetY = 666 - hitBoxHeight - 10;  // 576px (발바닥 위치, 필요시 숫자로 미세조정 가능)
    player.body.setOffset(offsetX, offsetY);
}