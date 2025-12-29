import editable from 'thing-editor/src/editor/props-editor/editable';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';

/**
 * ParticleSprite - Short-lived animated sprite with scale, alpha, and movement over time.
 * Uses Vector2 for scale and speed properties.
 * Modernized version of ParticleShort with consolidated vector properties.
 */
export default class ParticleSprite extends DSprite {

    // --- Duration ---
    @editable()
    enableRandomDuration = false;

    @editable({ min: 3, visible: (o: ParticleSprite) => !o.enableRandomDuration })
    duration = 10;

    @editable({ type: 'vector2', vector2_minX: 3, vector2_minY: 3, vector2_stepX: 1, vector2_stepY: 1, visible: (o: ParticleSprite) => o.enableRandomDuration, tip: 'Min and max duration range (x = min, y = max)' })
    durationRange: Vector2 = { x: 5, y: 15 };

    // --- Speed Factor ---
    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_maxX: 1, vector2_minY: 0.01, vector2_maxY: 1, vector2_stepX: 0.01, vector2_stepY: 0.01, tip: 'Speed damping factor per axis (x, y)' })
    speedFactor: Vector2 = { x: 0.93, y: 0.93 };

    // --- Start Scale ---
    @editable()
    enableRandomStartScale = false;

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => !o.enableRandomStartScale, tip: 'Initial scale (x, y)' })
    startScale: Vector2 = { x: 1.0, y: 1.0 };

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => o.enableRandomStartScale, tip: 'Minimum random start scale (x, y)' })
    minStartScale: Vector2 = { x: 0.1, y: 0.1 };

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => o.enableRandomStartScale, tip: 'Maximum random start scale (x, y)' })
    maxStartScale: Vector2 = { x: 0.5, y: 0.5 };

    // --- End Scale ---
    @editable()
    enableScaleOverDuration = false;

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => o.enableScaleOverDuration, tip: 'End scale multiplier (x, y)' })
    endScale: Vector2 = { x: 1.0, y: 1.0 };

    // --- Flip ---
    @editable()
    randomFlipX = true;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleSprite) => o.randomFlipX })
    chanceFlipX = 0.5;

    @editable()
    randomFlipY = false;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleSprite) => o.randomFlipY })
    chanceFlipY = 0.5;

    // --- Alpha ---
    @editable({ min: 0, max: 1, step: 0.01 })
    startAlpha = 1.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlpha = 0.5;

    @editable({ min: 0, max: 1, step: 0.01 })
    endAlpha = 0.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlphaPosition = 0.5;

    // --- Internal state ---
    size = 1;
    chanceToRemove = 0;
    scaleSpeedX = 0;
    scaleSpeedY = 0;
    alphaSpeed1 = 0;
    alphaSpeed2 = 0;
    middleTime = 0;
    age = 0;
    currentDuration = 0;

    init() {
        super.init();

        this.age = 0;

        this.currentDuration = this.enableRandomDuration
            ? this.durationRange.x + Math.random() * (this.durationRange.y - this.durationRange.x)
            : this.duration;
        this.size = this.scale.x * (Math.random() + 0.2);

        let initialScaleX = this.enableRandomStartScale
            ? this.minStartScale.x + Math.random() * (this.maxStartScale.x - this.minStartScale.x)
            : this.startScale.x;

        let initialScaleY = this.enableRandomStartScale
            ? this.minStartScale.y + Math.random() * (this.maxStartScale.y - this.minStartScale.y)
            : this.startScale.y;

        this.scale.x = initialScaleX;
        this.scale.y = initialScaleY;

        if (this.randomFlipX && Math.random() < this.chanceFlipX) {
            this.scale.x = -this.scale.x;
        }
        if (this.randomFlipY && Math.random() < this.chanceFlipY) {
            this.scale.y = -this.scale.y;
        }

        if (this.enableScaleOverDuration) {
            const targetScaleX = initialScaleX * this.endScale.x;
            const targetScaleY = initialScaleY * this.endScale.y;
            this.scaleSpeedX = (targetScaleX - initialScaleX) / this.currentDuration;
            this.scaleSpeedY = (targetScaleY - initialScaleY) / this.currentDuration;
        }

        this.middleTime = this.middleAlphaPosition * this.currentDuration;

        if (this.middleTime > 0) {
            this.alphaSpeed1 = (this.middleAlpha - this.startAlpha) / this.middleTime;
        }

        const timeAfterMiddle = this.currentDuration - this.middleTime;
        if (timeAfterMiddle > 0) {
            this.alphaSpeed2 = (this.endAlpha - this.middleAlpha) / timeAfterMiddle;
        }

        this.alpha = this.startAlpha;

        this.chanceToRemove = 1 - 1 / this.currentDuration;
    }

    update() {
        this.age++;

        if (this.enableScaleOverDuration) {
            this.scale.x += this.scaleSpeedX;
            this.scale.y += this.scaleSpeedY;
        }

        if (this.age < this.middleTime) {
            this.alpha += this.alphaSpeed1;
        } else {
            this.alpha += this.alphaSpeed2;
        }

        if (this.alpha <= 0) {
            this.remove();
        }

        this.xSpeed += (Math.random() - 0.5);
        this.xSpeed *= this.speedFactor.x;
        this.ySpeed += (Math.random() - 0.65);
        this.ySpeed *= this.speedFactor.y;

        super.update();
    }
}

/// #if EDITOR
ParticleSprite.__EDITOR_icon = 'tree/particle-container';
ParticleSprite.__EDITOR_tip = '<b>ParticleSprite</b> - Short-lived animated sprite with scale, alpha, and movement over time. Uses Vector2 for scale and speed properties.';
/// #endif
