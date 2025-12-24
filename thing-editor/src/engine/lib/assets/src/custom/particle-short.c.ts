import editable from 'thing-editor/src/editor/props-editor/editable';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';

export default class ParticleShort extends DSprite {

    @editable()
    enableRandomDuration = false;

    @editable({ min: 3, visible: (o: ParticleShort) => !o.enableRandomDuration })
    duration = 10;

    @editable({ min: 3, step: 1, visible: (o: ParticleShort) => o.enableRandomDuration })
    minDuration = 5;

    @editable({ min: 3, step: 1, visible: (o: ParticleShort) => o.enableRandomDuration })
    maxDuration = 15;

    @editable({ min: 0.01, max: 1 })
    xSpeedFactor = 0.93;

    @editable({ min: 0.01, max: 1 })
    ySpeedFactor = 0.93;

    @editable()
    enableRandomStartScale = false;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => !o.enableRandomStartScale })
    startScaleX = 1.0;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => !o.enableRandomStartScale })
    startScaleY = 1.0;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => o.enableRandomStartScale })
    minStartScaleX = 0.1;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => o.enableRandomStartScale })
    maxStartScaleX = 0.5;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => o.enableRandomStartScale })
    minStartScaleY = 0.1;

    @editable({ min: 0.01, step: 0.01, visible: (o: ParticleShort) => o.enableRandomStartScale })
    maxStartScaleY = 0.5;

    @editable()
    enableScaleOverDuration = false;

    @editable({ min: 0.01, step: 0.01 })
    endScaleX = 1.0;

    @editable({ min: 0.01, step: 0.01 })
    endScaleY = 1.0;

    @editable()
    randomFlipX = true;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleShort) => o.randomFlipX })
    chanceFlipX = 0.5;

    @editable()
    randomFlipY = false;

    @editable({ min: 0, max: 1, step: 0.01, visible: (o: ParticleShort) => o.randomFlipY })
    chanceFlipY = 0.5;

    @editable({ min: 0, max: 1, step: 0.01 })
    startAlpha = 1.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlpha = 0.5;

    @editable({ min: 0, max: 1, step: 0.01 })
    endAlpha = 0.0;

    @editable({ min: 0, max: 1, step: 0.01 })
    middleAlphaPosition = 0.5;

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
            ? this.minDuration + Math.random() * (this.maxDuration - this.minDuration)
            : this.duration;
        this.size = this.scale.x * (Math.random() + 0.2);

        let initialScaleX = this.enableRandomStartScale
            ? this.minStartScaleX + Math.random() * (this.maxStartScaleX - this.minStartScaleX)
            : this.startScaleX;

        let initialScaleY = this.enableRandomStartScale
            ? this.minStartScaleY + Math.random() * (this.maxStartScaleY - this.minStartScaleY)
            : this.startScaleY;

        this.scale.x = initialScaleX;
        this.scale.y = initialScaleY;

        if (this.randomFlipX && Math.random() < this.chanceFlipX) {
            this.scale.x = -this.scale.x;
        }
        if (this.randomFlipY && Math.random() < this.chanceFlipY) {
            this.scale.y = -this.scale.y;
        }

        if (this.enableScaleOverDuration) {
            const targetScaleX = initialScaleX * this.endScaleX;
            const targetScaleY = initialScaleY * this.endScaleY;
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
        this.xSpeed *= this.xSpeedFactor;
        this.ySpeed += (Math.random() - 0.65);
        this.ySpeed *= this.ySpeedFactor;

        super.update();
    }
}