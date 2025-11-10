const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');
const millisecondsElement = document.getElementById('milliseconds');
const toggleTimerBtn = document.getElementById('toggle-timer-btn');
const resetBtn = document.getElementById('reset-btn');
const testSoundBtn = document.getElementById('test-sound-btn');
const messageContainer = document.getElementById('message-container');
const timeDisplay = document.querySelector('.time-display');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const colonElement = document.createElement('span');
colonElement.classList.add('colon');
colonElement.textContent = ':';
minutesElement.after(colonElement);

const bell1HoursInput = document.getElementById('bell1-hours');
const bell1MinutesInput = document.getElementById('bell1-minutes');
const bell1SecondsInput = document.getElementById('bell1-seconds');
const bell2HoursInput = document.getElementById('bell2-hours');
const bell2MinutesInput = document.getElementById('bell2-minutes');
const bell2SecondsInput = document.getElementById('bell2-seconds');
const bell3HoursInput = document.getElementById('bell3-hours');
const bell3MinutesInput = document.getElementById('bell3-minutes');
const bell3SecondsInput = document.getElementById('bell3-seconds');
const soundSelect = document.getElementById('sound-select');
const bellSoundElement = document.getElementById('bell-sound');

let totalSeconds = 0;
let isRunning = false;
let bellTimes = [];
let rungBellCounts = 0;
let isOvertime = false;
let initialTotalSecondsForBellCheck = 0;

// NoSleep.jsのインスタンス
const noSleep = new NoSleep();
const enableNoSleepBtn = document.getElementById('enable-nosleep');

// AudioContextの初期化
let audioContext;
let audioBuffer;

// Web Workerの初期化
const timerWorker = new Worker('timer-worker.js');

timerWorker.onmessage = function(e) {
    totalSeconds = e.data.totalSeconds;
    isOvertime = totalSeconds < 0;
    updateDisplay();
    checkBellTimes();
};

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("このブラウザは通知をサポートしていません。");
        return;
    }
    if (Notification.permission === "default") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                console.log("通知の許可が与えられました。");
            } else {
                console.warn("通知の許可が拒否されました。");
            }
        });
    }
}

function showNotification(title, body) {
    if (Notification.permission === "granted") {
        try {
            const options = {
                body: body,
                icon: 'icon.png'
            };
            new Notification(title, options);
        } catch (err) {
            console.error("通知の表示に失敗しました:", err);
        }
    }
}

function updateDisplay() {
    let displayTotalSeconds = isOvertime ? Math.abs(totalSeconds) : Math.max(0, totalSeconds);
    let sign = isOvertime ? '+' : '';

    const minutes = Math.floor(displayTotalSeconds / 60);
    const seconds = Math.floor(displayTotalSeconds % 60);
    const milliseconds = Math.floor((displayTotalSeconds * 1000) % 1000 / 10);

    minutesElement.textContent = sign + String(minutes).padStart(2, '0');
    secondsElement.textContent = String(seconds).padStart(2, '0');
    millisecondsElement.textContent = String(milliseconds).padStart(2, '0');

    timeDisplay.classList.toggle('overtime-red', isOvertime);
    timeDisplay.classList.toggle('warning-yellow', !isOvertime && rungBellCounts === 1);
    timeDisplay.classList.toggle('warning-purple', !isOvertime && rungBellCounts === 2);
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    initialTotalSecondsForBellCheck = totalSeconds;
    timerWorker.postMessage({ command: 'start', value: totalSeconds });
    noSleep.enable(); // タイマー開始時にスリープ防止を有効化
}

function stopTimer() {
    if (!isRunning) return;
    isRunning = false;
    timerWorker.postMessage({ command: 'stop' });
    noSleep.disable(); // タイマー停止時にスリープ防止を無効化
}

function resetTimer() {
    stopTimer(); // releaseWakeLockもここで呼ばれる
    saveBellSettings();
    timerWorker.postMessage({ command: 'reset', value: totalSeconds });
    messageContainer.textContent = '';
    rungBellCounts = 0;
    isOvertime = false;
    bellTimes.forEach(bell => bell.rung = false);
    timeDisplay.className = 'time-display';
    updateDisplay();
}

function playSoundWithAudioContext(count) {
    if (!audioContext || !audioBuffer) {
        console.warn("AudioContext is not ready or buffer is not loaded.");
        // フォールバックとして元の再生方法を試す
        if (bellSoundElement) {
            bellSoundElement.play().catch(e => console.error('Fallback audio play failed:', e));
        }
        return;
    }
    
    for (let i = 0; i < count; i++) {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(audioContext.currentTime + i * 0.4); // 0.4秒間隔で再生
    }
}

function playSoundAndNotify(count, message) {
    showNotification("プレゼンタイマー", message);
    playSoundWithAudioContext(count);
}

function checkBellTimes() {
    const currentElapsedTime = initialTotalSecondsForBellCheck - totalSeconds;
    let needsColorUpdate = false;

    bellTimes.forEach(bellSetting => {
        if (!isOvertime && !bellSetting.rung && currentElapsedTime >= bellSetting.time) {
            const message = `${Math.floor(bellSetting.time / 60)}分${bellSetting.time % 60}秒経過しました。`;
            playSoundAndNotify(bellSetting.count, message);
            bellSetting.rung = true;
            rungBellCounts++;
            needsColorUpdate = true;
        }
    });

    if (!isOvertime && totalSeconds <= 0 && rungBellCounts < 3) {
        playSoundAndNotify(3, '時間です！');
        rungBellCounts = 3;
        needsColorUpdate = true;
    }

    if (needsColorUpdate) {
        updateDisplay(); // 色の更新を明示的に呼び出す
    }
}

function saveBellSettings() {
    bellTimes = [];
    const getSeconds = (h, m, s) => (parseInt(h.value) || 0) * 3600 + (parseInt(m.value) || 0) * 60 + (parseInt(s.value) || 0);
    
    const bell1Time = getSeconds(bell1HoursInput, bell1MinutesInput, bell1SecondsInput);
    if (bell1Time > 0) bellTimes.push({ time: bell1Time, count: 1, rung: false });

    const bell2Time = getSeconds(bell2HoursInput, bell2MinutesInput, bell2SecondsInput);
    if (bell2Time > 0) bellTimes.push({ time: bell2Time, count: 2, rung: false });

    const bell3Time = getSeconds(bell3HoursInput, bell3MinutesInput, bell3SecondsInput);
    if (bell3Time > 0) {
        bellTimes.push({ time: bell3Time, count: 3, rung: false });
        totalSeconds = bell3Time;
    } else {
        totalSeconds = 0;
    }
    
    bellTimes.sort((a, b) => a.time - b.time);
    updateDisplay();
}

function handleSoundSelectChange() {
    const selectedSound = soundSelect.value;
    bellSoundElement.src = selectedSound;
    bellSoundElement.load();
    loadSound(selectedSound); // AudioContext用にサウンドを読み込み直す
}

function setSoundBasedOnDate() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    let defaultSound = 'sei_ge_bell01.mp3';

    if (month === 12) defaultSound = 'Christmas.mp3';
    if (month === 11 && day === 10) defaultSound = 'shamisen.mp3';
    if (month === 1 && day === 1) defaultSound = 'kodaiko.mp3';
    if (month === 1 && day === 2) defaultSound = 'oodaiko.mp3';
    if (month === 1 && day === 3) defaultSound = 'rifle.mp3';
    if (month === 1 && day === 4) defaultSound = 'taihou.mp3';
    if (month === 1 && day === 5) defaultSound = 'hato.mp3';
    if (month === 1 && day === 6) defaultSound = 'niwatori.mp3';
    if (month === 7) defaultSound = 'higurashi.mp3';
    if (month === 8) defaultSound = 'minminzemi.mp3';

    soundSelect.value = defaultSound;
    bellSoundElement.src = defaultSound;
    bellSoundElement.load();
}

[bell1HoursInput, bell1MinutesInput, bell1SecondsInput,
 bell2HoursInput, bell2MinutesInput, bell2SecondsInput,
 bell3HoursInput, bell3MinutesInput, bell3SecondsInput].forEach(input => {
    input.addEventListener('input', saveBellSettings);
});

soundSelect.addEventListener('change', handleSoundSelectChange);

// AudioContextをユーザー操作で有効化するための関数
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            loadSound(soundSelect.value); // 初期サウンドを読み込む
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }
}

// 音声ファイルをAudioBufferにデコードして読み込む関数
function loadSound(url) {
    if (!audioContext) return;
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => audioContext.decodeAudioData(data))
        .then(buffer => {
            audioBuffer = buffer;
            console.log("Sound loaded and decoded:", url);
        })
        .catch(e => console.error("Error loading sound:", e));
}

toggleTimerBtn.addEventListener('click', () => {
    initAudioContext(); // 最初のクリックでAudioContextを初期化
    if (isRunning) {
        stopTimer();
        toggleTimerBtn.textContent = 'スタート';
    } else {
        startTimer();
        toggleTimerBtn.textContent = 'ストップ';
    }
});

resetBtn.addEventListener('click', () => {
    resetTimer();
    toggleTimerBtn.textContent = 'スタート';
});

enableNoSleepBtn.addEventListener('click', () => {
    noSleep.enable();
    alert("スリープ防止を有効にしました。");
});

testSoundBtn.addEventListener('click', () => {
    initAudioContext(); // AudioContextが初期化されていなければ初期化
    playSoundWithAudioContext(1);
});

updateDisplay();
saveBellSettings();
requestNotificationPermission();
setSoundBasedOnDate();
