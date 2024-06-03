let audio = null, ctx, src, fltr, panner;
function setupAudio() {
    audio = document.getElementById('msc');

    audio.addEventListener('play', () => {
        if (!ctx) {
            ctx = new AudioContext();
            src = ctx.createMediaElementSource(audio);
            panner = ctx.createPanner();
            fltr = ctx.createBiquadFilter();

            src.connect(panner);
            panner.connect(fltr);
            fltr.connect(ctx.destination);

            fltr.type = 'lowpass';
            fltr.Q.value = 0.5;
            fltr.frequency.value = 1234;
            ctx.resume();
        }
    })


    audio.addEventListener('pause', () => {
        console.log('pause');
        ctx.resume();
    })
}

function initAudio() {
    setupAudio();
    let radioButton = document.getElementById('fltr');
    radioButton.addEventListener('change', function() {
        if (radioButton.checked) {
            panner.disconnect();
            panner.connect(fltr);
            fltr.connect(ctx.destination);
        } else {
            panner.disconnect();
            panner.connect(ctx.destination);
        }
    });
    audio.play();
}