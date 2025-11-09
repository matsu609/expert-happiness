const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');
const millisecondsElement = document.getElementById('milliseconds'); // ミリ秒要素を追加
const toggleTimerBtn = document.getElementById('toggle-timer-btn'); // 新しいボタン要素
const resetBtn = document.getElementById('reset-btn');
const testSoundBtn = document.getElementById('test-sound-btn');
const messageContainer = document.getElementById('message-container');
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const bellInputs = document.querySelectorAll('.bell-input');

let timer;
let totalSeconds = 0; // 秒単位で管理（浮動小数点数）
let initialTotalSeconds = 0; // タイマー開始時の総秒数を記録
let isRunning = false;
let bellTimes = []; // [{ time: minutes, count: bells }]
let rungBellTimes = []; // 既にベルが鳴った経過時間を記録
let startTime = 0; // タイマー開始時のタイムスタンプ
let remainingTimeAtPause = 0; // 一時停止時の残り時間
let finalBellsRung = false; // 最終ベルが鳴ったかどうか

let audioContext; // AudioContextをグローバルスコープに移動

const alarmSound = createBeepSound();

// 通知許可を要求する関数
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

// 通知を表示する関数
function showNotification(title, body, sound = true) {
    if (Notification.permission === "granted") {
        const options = {
            body: body,
            icon: 'icon.png' // 必要であればアイコンパスを指定
        };
        const notification = new Notification(title, options);

        if (sound && alarmSound) {
            alarmSound.play(); // 通知と同時に音を鳴らす
        }
    } else if (Notification.permission === "denied") {
        console.warn("通知が拒否されているため、通知を表示できません。");
    }
}

function createBeepSound() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)(); // グローバル変数に代入
    if (!audioContext) {
        console.error("AudioContext is not supported in this browser.");
        return null;
    }

    function bellSound() {
        const now = audioContext.currentTime;
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        
        // Main tone
        const osc1 = audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.50, now); // C6
        osc1.connect(gainNode);

        // Overtone
        const osc2 = audioContext.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2093.00, now); // C7
        osc2.connect(gainNode);

        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
    }

    return { play: bellSound };
}

function updateDisplay() {
    const totalMilliseconds = Math.max(0, totalSeconds * 1000); // マイナスにならないようにMath.max
    const minutes = Math.floor(totalMilliseconds / (60 * 1000));
    const seconds = Math.floor((totalMilliseconds % (60 * 1000)) / 1000);
    const milliseconds = Math.floor(totalMilliseconds % 1000);

    minutesElement.textContent = String(minutes).padStart(2, '0');
    secondsElement.textContent = String(seconds).padStart(2, '0');
    millisecondsElement.textContent = String(milliseconds).padStart(3, '0');
}

function startTimer() {
    if (isRunning || totalSeconds <= 0) return;

    // AudioContextが中断状態の場合、再開を試みる
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully.');
            console.log('AudioContext state after resume (startTimer):', audioContext.state);
            // 再開後に音を鳴らす（オプション）
            // alarmSound.play();
        }).catch(e => {
            console.error('Failed to resume AudioContext:', e);
        });
    } else {
        console.log('AudioContext state (startTimer):', audioContext ? audioContext.state : 'not initialized');
    }

    messageContainer.textContent = '';
    isRunning = true;
    initialTotalSeconds = totalSeconds; // タイマー開始時の総秒数を記録
    startTime = Date.now(); // タイマー開始時のタイムスタンプを記録 (ミリ秒)
    timer = setInterval(() => {
        const now = Date.now();
        const elapsedSinceStart = (now - startTime) / 1000; // 開始からの経過時間（秒）
        totalSeconds = initialTotalSeconds - elapsedSinceStart;

        if (totalSeconds <= 0) {
            totalSeconds = 0;
            updateDisplay();
            if (!finalBellsRung) {
                playFinalBells();
                messageContainer.textContent = '時間です！';
                finalBellsRung = true;
            }
            stopTimer();
            return;
        }

        updateDisplay();
        checkBellTimes();
    }, 10); // 10ミリ秒ごとに更新
}

function stopTimer() {
    clearInterval(timer);
    isRunning = false;
    remainingTimeAtPause = totalSeconds; // 一時停止時の残り時間を記録
}


function resetTimer() {
    stopTimer();
    const bell3Input = document.getElementById('bell3');
    const bell3Time = parseInt(bell3Input.value);
    totalSeconds = (!isNaN(bell3Time) && bell3Time > 0) ? bell3Time * 60 : 0; // 秒単位
    messageContainer.textContent = '';
    updateDisplay();
    rungBellTimes = []; // リセット時に鳴らしたベルの記録をクリア
    finalBellsRung = false; // 最終ベルのフラグをリセット
}

function playBellMultipleTimes(count, message) {
    // 通知は一度だけ表示し、音は複数回鳴らす
    showNotification("プレゼンタイマー", message, false); // 通知は音なしで表示

    if (!alarmSound) return;

    let currentCount = 0;
    const playSingleBell = () => {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed for single bell play.');
                alarmSound.play();
            }).catch(e => {
                console.error('Failed to resume AudioContext for single bell play:', e);
            });
        } else {
            alarmSound.play(); // 音だけを鳴らす
        }
        currentCount++;
        if (currentCount < count) {
            setTimeout(playSingleBell, 300); // 0.3秒間隔で再帰的に呼び出し
        }
    };

    playSingleBell(); // 最初のベルを鳴らす
}

function playFinalBells() {
    playBellMultipleTimes(3, '時間です！'); // 最終ベルは常に3回
}

function checkBellTimes() {
    const currentElapsedTime = initialTotalSeconds - totalSeconds; // 経過時間を計算（秒単位、浮動小数点数）
    console.log('checkBellTimes - currentElapsedTime:', currentElapsedTime);
    console.log('checkBellTimes - bellTimes:', bellTimes);
    console.log('checkBellTimes - rungBellTimes:', rungBellTimes);

    bellTimes.forEach(bellSetting => {
        const bellTriggerTime = bellSetting.time * 60; // ベルが鳴るべき経過時間（秒単位）
        const tolerance = 0.1; // 許容誤差を100ミリ秒に広げる

        console.log(`  Bell Setting: ${bellSetting.time} min (${bellTriggerTime} sec), Count: ${bellSetting.count}`);
        console.log(`  Condition: currentElapsedTime (${currentElapsedTime}) >= bellTriggerTime - tolerance (${bellTriggerTime - tolerance}) && currentElapsedTime (${currentElapsedTime}) <= bellTriggerTime + tolerance (${bellTriggerTime + tolerance}) && !rungBellTimes.includes(${bellTriggerTime})`);

        // ベルが鳴るべき時刻に到達し、かつまだ鳴らされていない場合
        if (currentElapsedTime >= bellTriggerTime - tolerance && currentElapsedTime <= bellTriggerTime + tolerance && !rungBellTimes.includes(bellTriggerTime)) {
            const message = `${bellSetting.time}分経過しました。`;
            console.log(`  !!! Playing bell for ${bellSetting.time} min, count: ${bellSetting.count}`);
            playBellMultipleTimes(bellSetting.count, message);
            rungBellTimes.push(bellTriggerTime); // 鳴らした経過時間を記録
        }
    });
}

function saveBellSettings() {
    bellTimes = [];
    let bell3Time = 0; // bell3の時間を一時的に保持

    bellInputs.forEach(input => {
        const time = parseInt(input.value);
        if (!isNaN(time) && time > 0) {
            let bellCount = 0;
            if (input.id === 'bell1') {
                bellCount = 1;
            } else if (input.id === 'bell2') {
                bellCount = 2;
            } else if (input.id === 'bell3') {
                bellCount = 3;
                bell3Time = time; // bell3の時間を保存
            }
            if (bellCount > 0) {
                bellTimes.push({ time: time, count: bellCount });
            }
        }
    });

    // bellTimesを時間でソート（オプション）
    bellTimes.sort((a, b) => a.time - b.time);
    console.log('saveBellSettings - bellTimes:', bellTimes); // ログを追加

    // bell3の時間をtotalSecondsに設定し、表示を更新
    if (bell3Time > 0) {
        totalSeconds = bell3Time * 60;
        updateDisplay();
    }
}

bellInputs.forEach(input => {
    input.addEventListener('input', saveBellSettings);
});

toggleTimerBtn.addEventListener('click', () => {
    if (isRunning) {
        stopTimer();
        toggleTimerBtn.textContent = 'スタート';
    } else {
        startTimer();
        toggleTimerBtn.textContent = 'ストップ';
    }
});

resetBtn.addEventListener('click', () => {
    saveBellSettings(); // リセットボタンが押されたときに設定を保存
    resetTimer();
    toggleTimerBtn.textContent = 'スタート'; // リセット時はスタートに戻す
});

testSoundBtn.addEventListener('click', () => {
    if (alarmSound) {
        alarmSound.play();
    }
});

updateDisplay();
saveBellSettings();
requestNotificationPermission(); // ページロード時に通知許可を求める

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // タブが非表示になったら、現在の時刻と残り時間を保存
        if (isRunning) {
            clearInterval(timer); // setIntervalを停止
            remainingTimeAtPause = totalSeconds;
            startTime = Date.now(); // 非表示になった時刻を記録
        }
    } else {
        // タブが再び表示されたら、経過時間を補償してタイマーを再開
        if (isRunning) {
            // AudioContextが中断状態の場合、再開を試みる
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully on visibilitychange.');
                }).catch(e => {
                    console.error('Failed to resume AudioContext on visibilitychange:', e);
                });
            }

            const now = Date.now();
            const hiddenDuration = (now - startTime) / 1000; // 非表示になっていた時間（秒）
            const oldTotalSeconds = remainingTimeAtPause; // 非表示になる前の残り時間
            totalSeconds = remainingTimeAtPause - hiddenDuration; // 残り時間を補償

            // 非表示になっていた間に鳴るべきだったベルをチェックし、鳴らす
            // initialTotalSecondsはタイマー開始時の総時間なので、経過時間は initialTotalSeconds - totalSeconds
            const oldElapsedTime = initialTotalSeconds - oldTotalSeconds;
            const newElapsedTime = initialTotalSeconds - totalSeconds;

            bellTimes.forEach(bellSetting => {
                const bellTriggerTime = bellSetting.time * 60; // ベルが鳴るべき経過時間（秒単位）

                // 非表示になっていた間にベルが鳴るべき時刻が過ぎていた場合
                if (oldElapsedTime < bellTriggerTime && newElapsedTime >= bellTriggerTime && !rungBellTimes.includes(bellTriggerTime)) {
                    const message = `${bellSetting.time}分経過しました。`; // メッセージを生成
                    playBellMultipleTimes(bellSetting.count, message); // message引数を渡す
                    rungBellTimes.push(bellTriggerTime); // 鳴らした経過時間を記録
                }
            });

            // タイマーが0以下になっていた場合
            if (totalSeconds <= 0) {
                totalSeconds = 0;
                updateDisplay();
                if (!finalBellsRung) {
                    playFinalBells(); // playFinalBellsは既にmessage引数を持つplayBellMultipleTimesを呼び出している
                    messageContainer.textContent = '時間です！';
                    finalBellsRung = true;
                }
                stopTimer();
                return;
            }

            // タイマーを再開
            initialTotalSeconds = totalSeconds; // 補償後のtotalSecondsをinitialTotalSecondsとして設定
            startTime = now; // 新しい開始時刻を設定
            timer = setInterval(() => {
                const currentNow = Date.now();
                const elapsedSinceStart = (currentNow - startTime) / 1000;
                totalSeconds = initialTotalSeconds - elapsedSinceStart;

                if (totalSeconds <= 0) {
                    totalSeconds = 0;
                    updateDisplay();
                    if (!finalBellsRung) {
                        playFinalBells();
                        messageContainer.textContent = '時間です！';
                        finalBellsRung = true;
                    }
                    stopTimer();
                    return;
                }

                updateDisplay();
                checkBellTimes();
            }, 10);
        }
    }
});
