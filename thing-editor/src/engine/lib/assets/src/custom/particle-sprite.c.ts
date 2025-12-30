import editable from 'thing-editor/src/editor/props-editor/editable';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';

/**
 * ParticleSprite - Short-lived animated sprite with scale, alpha, and movement over time.
 * Uses Vector2 for scale and speed properties.
 * Modernized version of ParticleShort with consolidated vector properties.
 */
export default class ParticleSprite extends DSprite {

    // --- Duration ---
    @editable({ type: 'splitter', title: 'Duration' })
    _durationSplitter = null;

    @editable()
    enableRandomDuration = false;

    @editable({ min: 3, visible: (o: ParticleSprite) => !o.enableRandomDuration })
    duration = 10;

    @editable({ type: 'vector2', vector2_minX: 3, vector2_minY: 3, vector2_stepX: 1, vector2_stepY: 1, visible: (o: ParticleSprite) => o.enableRandomDuration, tip: 'Min and max duration range (x = min, y = max)' })
    durationRange: Vector2 = { x: 5, y: 15 };

    // --- Speed ---
    @editable({ type: 'splitter', title: 'Speed' })
    _speedSplitter = null;

    @editable({ type: 'vector2', vector2_minX: 0, vector2_minY: 0, vector2_stepX: 0.01, vector2_stepY: 0.01, tip: 'Speed damping factor per axis (x, y)' })
    speedFactor: Vector2 = { x: 0.93, y: 0.93 };

    // Was hardcoded as 0.15 (calculated from 0.65 - 0.5), which caused particles to fall down over time
    @editable({ step: 0.01, tip: 'Gravity effect on Y speed (positive = falls down)' })
    gravity = 0;

    // Was hardcoded as (Math.random() - 0.5) for both xSpeed and ySpeed
    @editable({ tip: 'Enable random speed variation each frame' })
    enableRandomSpeed = false;

    // --- Scale ---
    @editable({ type: 'splitter', title: 'Scale' })
    _scaleSplitter = null;

    @editable()
    enableRandomStartScale = false;

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => !o.enableRandomStartScale, tip: 'Initial scale (x, y)' })
    startScale: Vector2 = { x: 1.0, y: 1.0 };

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => o.enableRandomStartScale, tip: 'Minimum random start scale (x, y)' })
    minStartScale: Vector2 = { x: 0.1, y: 0.1 };

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, visible: (o: ParticleSprite) => o.enableRandomStartScale, tip: 'Maximum random start scale (x, y)' })
    maxStartScale: Vector2 = { x: 0.5, y: 0.5 };

    @editable({ type: 'vector2', vector2_minX: 0.01, vector2_minY: 0.01, vector2_stepX: 0.01, vector2_stepY: 0.01, tip: 'End scale multiplier (x, y)' })
    endScale: Vector2 = { x: 1.0, y: 1.0 };

    // --- Flip ---
    @editable({ type: 'splitter', title: 'Flip' })
    _flipSplitter = null;

    @editable()
    randomFlipX = true;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleSprite) => o.randomFlipX })
    chanceFlipX = 0.5;

    @editable()
    randomFlipY = false;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleSprite) => o.randomFlipY })
    chanceFlipY = 0.5;

    // --- Alpha ---
    @editable({ type: 'splitter', title: 'Alpha' })
    _alphaSplitter = null;

    @editable({ min: 0, max: 1, step: 0.01 })
    startAlpha = 1.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlpha = 0.5;

    @editable({ min: 0, max: 1, step: 0.01 })
    endAlpha = 0.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlphaPosition = 0.5;

    // --- Rotation ---
    @editable({ type: 'splitter', title: 'Rotation' })
    _rotationSplitter = null;

    @editable({ step: 0.01, tip: 'Initial rotation in radians' })
    startRotation = 0;

    @editable({ step: 0.01, tip: 'Rotation speed in radians per frame' })
    rotationSpeed = 0;

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

        // Always calculate scale speed based on endScale (removed enableScaleOverDuration)
        const targetScaleX = initialScaleX * this.endScale.x;
        const targetScaleY = initialScaleY * this.endScale.y;
        this.scaleSpeedX = (targetScaleX - initialScaleX) / this.currentDuration;
        this.scaleSpeedY = (targetScaleY - initialScaleY) / this.currentDuration;

        this.middleTime = this.middleAlphaPosition * this.currentDuration;

        if (this.middleTime > 0) {
            this.alphaSpeed1 = (this.middleAlpha - this.startAlpha) / this.middleTime;
        }

        const timeAfterMiddle = this.currentDuration - this.middleTime;
        if (timeAfterMiddle > 0) {
            this.alphaSpeed2 = (this.endAlpha - this.middleAlpha) / timeAfterMiddle;
        }

        this.alpha = this.startAlpha;
        this.rotation = this.startRotation;

        this.chanceToRemove = 1 - 1 / this.currentDuration;
    }

    update() {
        this.age++;

        // Always apply scale over duration (removed enableScaleOverDuration check)
        this.scale.x += this.scaleSpeedX;
        this.scale.y += this.scaleSpeedY;

        if (this.age < this.middleTime) {
            this.alpha += this.alphaSpeed1;
        } else {
            this.alpha += this.alphaSpeed2;
        }

        if (this.alpha <= 0) {
            this.remove();
        }

        if (this.enableRandomSpeed) {
            this.xSpeed += (Math.random() - 0.5);
            this.ySpeed += (Math.random() - 0.5);
        }
        this.xSpeed *= this.speedFactor.x;
        this.ySpeed += this.gravity;
        this.ySpeed *= this.speedFactor.y;
        if (this.rotationSpeed !== 0) {
            this.rotation += this.rotationSpeed;
        }

        super.update();
    }
}

/// #if EDITOR
ParticleSprite.__EDITOR_icon = 'tree/particle-container';
ParticleSprite.__EDITOR_tip = '<b>ParticleSprite</b> - Short-lived animated sprite with scale, alpha, and movement over time. Uses Vector2 for scale and speed properties.';
/// #endif
