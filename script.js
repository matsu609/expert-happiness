const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');
const millisecondsElement = document.getElementById('milliseconds'); // ミリ秒要素を追加
const toggleTimerBtn = document.getElementById('toggle-timer-btn'); // 新しいボタン要素
const resetBtn = document.getElementById('reset-btn');
const testSoundBtn = document.getElementById('test-sound-btn');
const messageContainer = document.getElementById('message-container');
const timeDisplay = document.querySelector('.time-display'); // 時間表示要素を取得
const settingsPanel = document.getElementById('settings-panel');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const colonElement = document.createElement('span'); // コロン要素を新しく作成
colonElement.classList.add('colon');
colonElement.textContent = ':';
minutesElement.after(colonElement); // minutesElementの後にコロンを追加

// ベル1の入力フィールドの要素を取得
const bell1HoursInput = document.getElementById('bell1-hours');
const bell1MinutesInput = document.getElementById('bell1-minutes');
const bell1SecondsInput = document.getElementById('bell1-seconds');

// ベル2の入力フィールドの要素を取得
const bell2HoursInput = document.getElementById('bell2-hours');
const bell2MinutesInput = document.getElementById('bell2-minutes');
const bell2SecondsInput = document.getElementById('bell2-seconds');

// ベル3の入力フィールドの要素を取得
const bell3HoursInput = document.getElementById('bell3-hours');
const bell3MinutesInput = document.getElementById('bell3-minutes');
const bell3SecondsInput = document.getElementById('bell3-seconds');

const soundSelect = document.getElementById('sound-select'); // 音源選択要素を追加
const bellSoundElement = document.getElementById('bell-sound'); // MP3オーディオ要素を取得

let timer;
let totalSeconds = 0; // 秒単位で管理（浮動小数点数）
let initialTotalSeconds = 0; // タイマー開始時の総秒数を記録
let isRunning = false;
let bellTimes = []; // [{ time: seconds, count: bells, rung: false }]
let rungBellCounts = 0; // 鳴らしたベルの回数を記録 (1回目、2回目、3回目)
let startTime = 0; // タイマー開始時のタイムスタンプ
let remainingTimeAtPause = 0; // 一時停止時の残り時間
let isOvertime = false; // カウントアップ中かどうか

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

        if (sound && bellSoundElement) {
            bellSoundElement.play().catch(e => {
                console.error('Failed to play bell sound with notification:', e);
            });
        }
    } else if (Notification.permission === "denied") {
        console.warn("通知が拒否されているため、通知を表示できません。");
    }
}

function updateDisplay() {
    let displayTotalSeconds = totalSeconds;
    let sign = '';

    if (isOvertime) {
        displayTotalSeconds = Math.abs(totalSeconds); // カウントアップ中は絶対値を使用
        sign = '+';
    } else {
        displayTotalSeconds = Math.max(0, totalSeconds); // マイナスにならないようにMath.max
    }

    const totalMilliseconds = displayTotalSeconds * 1000;
    const hours = Math.floor(totalMilliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((totalMilliseconds % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((totalMilliseconds % (60 * 1000)) / 1000);
    const milliseconds = Math.floor(totalMilliseconds % 1000 / 10); // 2桁にするために10で割る

    minutesElement.textContent = sign + String(minutes).padStart(2, '0');
    secondsElement.textContent = String(seconds).padStart(2, '0');
    millisecondsElement.textContent = String(milliseconds).padStart(2, '0'); // 2桁表示

    // 時間表示のスタイルを更新
    if (isOvertime) {
        timeDisplay.classList.add('overtime-red');
        timeDisplay.classList.remove('warning-yellow', 'warning-purple');
    } else if (rungBellCounts === 1) {
        timeDisplay.classList.add('warning-yellow');
        timeDisplay.classList.remove('warning-purple', 'overtime-red');
    } else if (rungBellCounts === 2) {
        timeDisplay.classList.add('warning-purple');
        timeDisplay.classList.remove('warning-yellow', 'overtime-red');
    } else {
        timeDisplay.classList.remove('warning-yellow', 'warning-purple', 'overtime-red');
    }
}

function startTimer() {
    if (isRunning) return;

    messageContainer.textContent = '';
    isRunning = true;
    initialTotalSeconds = totalSeconds; // タイマー開始時の総秒数を記録
    startTime = Date.now(); // タイマー開始時のタイムスタンプを記録 (ミリ秒)
    isOvertime = false; // タイマー開始時はカウントアップではない

    timer = setInterval(() => {
        const now = Date.now();
        const elapsedSinceStart = (now - startTime) / 1000; // 開始からの経過時間（秒）

        if (!isOvertime) {
            totalSeconds = initialTotalSeconds - elapsedSinceStart;
            if (totalSeconds <= 0) {
                totalSeconds = 0; // 0秒で一旦停止
                if (rungBellCounts < 3) { // 3回目のベルが鳴るまで
                    playBellMultipleTimes(3, '時間です！');
                    rungBellCounts = 3; // 3回目のベルが鳴ったことを記録
                }
                isOvertime = true; // カウントアップに切り替え
                initialTotalSeconds = 0; // カウントアップの基準を0に設定
                startTime = Date.now(); // カウントアップ開始時刻をリセット
            }
        } else {
            // カウントアップ
            totalSeconds = -(elapsedSinceStart); // 経過時間を負の値として記録
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
    saveBellSettings(); // 最新の設定を読み込む
    messageContainer.textContent = '';
    rungBellCounts = 0; // 鳴らしたベルの回数をリセット
    isOvertime = false; // カウントアップ状態をリセット
    timeDisplay.classList.remove('warning-yellow', 'warning-purple', 'overtime-red'); // 色をリセット
    bellTimes.forEach(bell => bell.rung = false); // ベルの鳴動状態をリセット
    updateDisplay();
}

function playBellMultipleTimes(count, message) {
    showNotification("プレゼンタイマー", message, false); // 通知は音なしで表示

    if (!bellSoundElement) return;

    let currentCount = 0;
    const playSingleBell = () => {
        bellSoundElement.currentTime = 0; // 再生位置を先頭に戻す
        bellSoundElement.play().catch(e => {
            console.error('Failed to play bell sound:', e);
        });
        currentCount++;
        if (currentCount < count) {
            setTimeout(playSingleBell, 400); // 0.4秒間隔でベルを鳴らす
        }
    };

    playSingleBell(); // 最初のベルを鳴らす
}

function checkBellTimes() {
    const currentElapsedTime = initialTotalSeconds - totalSeconds; // 経過時間を計算（秒単位、浮動小数点数）

    bellTimes.forEach(bellSetting => {
        const bellTriggerTime = bellSetting.time; // 秒単位
        const tolerance = 0.1; // 許容誤差を100ミリ秒に広げる

        // ベルが鳴るべき時刻に到達し、かつまだ鳴らされていない場合
        if (!isOvertime && currentElapsedTime >= bellTriggerTime - tolerance && currentElapsedTime <= bellTriggerTime + tolerance && !bellSetting.rung) {
            const message = `${Math.floor(bellSetting.time / 60)}分${bellSetting.time % 60}秒経過しました。`;
            playBellMultipleTimes(bellSetting.count, message);
            bellSetting.rung = true; // 鳴らした経過時間を記録
            rungBellCounts++; // 鳴らしたベルの回数をインクリメント
        }
    });
}

function saveBellSettings() {
    bellTimes = [];

    // ベル1の設定
    const bell1Hours = parseInt(bell1HoursInput.value) || 0;
    const bell1Minutes = parseInt(bell1MinutesInput.value) || 0;
    const bell1Seconds = parseInt(bell1SecondsInput.value) || 0;
    const bell1Time = (bell1Hours * 3600) + (bell1Minutes * 60) + bell1Seconds;
    if (bell1Time > 0) {
        bellTimes.push({ time: bell1Time, count: 1, rung: false });
    }

    // ベル2の設定
    const bell2Hours = parseInt(bell2HoursInput.value) || 0;
    const bell2Minutes = parseInt(bell2MinutesInput.value) || 0;
    const bell2Seconds = parseInt(bell2SecondsInput.value) || 0;
    const bell2Time = (bell2Hours * 3600) + (bell2Minutes * 60) + bell2Seconds;
    if (bell2Time > 0) {
        bellTimes.push({ time: bell2Time, count: 2, rung: false });
    }

    // ベル3の設定
    const bell3Hours = parseInt(bell3HoursInput.value) || 0;
    const bell3Minutes = parseInt(bell3MinutesInput.value) || 0;
    const bell3Seconds = parseInt(bell3SecondsInput.value) || 0;
    const bell3Time = (bell3Hours * 3600) + (bell3Minutes * 60) + bell3Seconds;
    if (bell3Time > 0) {
        bellTimes.push({ time: bell3Time, count: 3, rung: false });
        totalSeconds = bell3Time; // 3回ベルが鳴る時間が初期設定の時間になるようにする
    } else {
        totalSeconds = 0; // ベル3が設定されていない場合は0
    }

    // bellTimesを時間でソート
    bellTimes.sort((a, b) => a.time - b.time);
    console.log('saveBellSettings - bellTimes:', bellTimes);

    updateDisplay();
}

// 音源選択の変更を処理する関数
function handleSoundSelectChange() {
    const selectedSound = soundSelect.value;
    bellSoundElement.src = selectedSound;
    bellSoundElement.load(); // 新しい音源をロード
    console.log('Sound source changed to:', selectedSound);
}

// 日付に基づいて音源を自動変更する関数
function setSoundBasedOnDate() {
    const today = new Date();
    const month = today.getMonth() + 1; // 1月は0なので+1
    const day = today.getDate();

    let defaultSound = 'sei_ge_bell01.mp3'; // デフォルトの音源

    // 例: 12月にはクリスマスサウンド
    if (month === 12) {
        defaultSound = 'Christmas.mp3';
    }
    // 例: 特定の日付に三味線サウンド (例: 11月10日)
    if (month === 11 && day === 10) { // 現在の日付に合わせて有効化
        defaultSound = 'shamisen.mp3';
    }
    // 例: 特定の日付に小太鼓サウンド (例: 1月1日)
    if (month === 1 && day === 1) {
        defaultSound = 'kodaiko.mp3';
    }
    // 例: 特定の日付に大太鼓サウンド (例: 1月2日)
    if (month === 1 && day === 2) {
        defaultSound = 'oodaiko.mp3';
    }
    // 例: 特定の日付にライフルサウンド (例: 1月3日)
    if (month === 1 && day === 3) {
        defaultSound = 'rifle.mp3';
    }
    // 例: 特定の日付に大砲サウンド (例: 1月4日)
    if (month === 1 && day === 4) {
        defaultSound = 'taihou.mp3';
    }
    // 例: 特定の日付にハトサウンド (例: 1月5日)
    if (month === 1 && day === 5) {
        defaultSound = 'hato.mp3';
    }
    // 例: 特定の日付にニワトリサウンド (例: 1月6日)
    if (month === 1 && day === 6) {
        defaultSound = 'niwatori.mp3';
    }
    // 例: 7月にはヒグラシサウンド
    if (month === 7) {
        defaultSound = 'higurashi.mp3';
    }
    // 例: 8月にはミンミンゼミサウンド
    if (month === 8) {
        defaultSound = 'minminzemi.mp3';
    }

    // 選択ボックスの値を更新し、音源をロード
    soundSelect.value = defaultSound;
    bellSoundElement.src = defaultSound;
    bellSoundElement.load();
    console.log('Auto-set sound source to:', defaultSound);
}


// 新しい入力フィールドにイベントリスナーを追加
[bell1HoursInput, bell1MinutesInput, bell1SecondsInput,
 bell2HoursInput, bell2MinutesInput, bell2SecondsInput,
 bell3HoursInput, bell3MinutesInput, bell3SecondsInput].forEach(input => {
    input.addEventListener('input', saveBellSettings);
});

soundSelect.addEventListener('change', handleSoundSelectChange); // 音源選択のイベントリスナーを追加

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
    resetTimer();
    toggleTimerBtn.textContent = 'スタート'; // リセット時はスタートに戻す
});

testSoundBtn.addEventListener('click', () => {
    if (bellSoundElement) {
        bellSoundElement.currentTime = 0; // 再生位置を先頭に戻す
        bellSoundElement.play().catch(e => {
            console.error('Failed to play test sound:', e);
        });
    }
});

updateDisplay();
saveBellSettings();
requestNotificationPermission(); // ページロード時に通知許可を求める
setSoundBasedOnDate(); // ページロード時に日付に基づいて音源を設定

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
        const now = Date.now();
        const hiddenDuration = (now - startTime) / 1000; // 非表示になっていた時間（秒）
        
        // 非表示中に経過した時間を考慮してtotalSecondsを更新
        totalSeconds = remainingTimeAtPause - hiddenDuration;

            // 非表示になっていた間に鳴るべきだったベルをチェックし、鳴らす
            // ここでは、ベルが鳴るべきだった時間を過ぎていれば鳴らすようにする
            bellTimes.forEach(bellSetting => {
                const bellTriggerTime = bellSetting.time; // 秒単位

                // 非表示になる前の残り時間 (remainingTimeAtPause) から、非表示になっていた間にベルが鳴るべきだったかチェック
                // totalSeconds (現在の残り時間) が bellTriggerTime を下回っていて、かつまだ鳴らされていない場合
                if (!isOvertime && remainingTimeAtPause >= bellTriggerTime && totalSeconds < bellTriggerTime && !bellSetting.rung) {
                    const message = `${Math.floor(bellSetting.time / 60)}分${bellSetting.time % 60}秒経過しました。`;
                    playBellMultipleTimes(bellSetting.count, message);
                    bellSetting.rung = true; // 鳴らした経過時間を記録
                    rungBellCounts++; // 鳴らしたベルの回数をインクリメント
                }
            });

            // タイマーが0以下になっていた場合
            if (!isOvertime && totalSeconds <= 0) {
                totalSeconds = 0;
                if (rungBellCounts < 3) {
                    playBellMultipleTimes(3, '時間です！');
                    rungBellCounts = 3;
                }
                isOvertime = true;
            }

            // タイマーを再開
            initialTotalSeconds = totalSeconds; // 補償後のtotalSecondsをinitialTotalSecondsとして設定
            startTime = now; // 新しい開始時刻を設定
            timer = setInterval(() => {
                const currentNow = Date.now();
                const elapsedSinceStart = (currentNow - startTime) / 1000;

                if (!isOvertime) {
                    totalSeconds = initialTotalSeconds - elapsedSinceStart;
                    if (totalSeconds <= 0) {
                        totalSeconds = 0;
                        if (rungBellCounts < 3) {
                            playBellMultipleTimes(3, '時間です！');
                            rungBellCounts = 3;
                        }
                        isOvertime = true;
                        initialTotalSeconds = 0;
                        startTime = Date.now();
                    }
                } else {
                    totalSeconds = initialTotalSeconds - elapsedSinceStart; // カウントアップ中は負の値からさらに減らす
                }

                updateDisplay();
                checkBellTimes();
            }, 10);
        }
    }
});
