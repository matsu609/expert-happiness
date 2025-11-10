let timer;
let totalSeconds = 0;
let initialTotalSeconds = 0;
let startTime = 0;
let isOvertime = false;

self.onmessage = function(e) {
    const { command, value } = e.data;

    if (command === 'start') {
        totalSeconds = value;
        initialTotalSeconds = value;
        startTime = Date.now();
        isOvertime = false;

        if (timer) clearInterval(timer);

        timer = setInterval(() => {
            const now = Date.now();
            const elapsedSinceStart = (now - startTime) / 1000;

            if (!isOvertime) {
                totalSeconds = initialTotalSeconds - elapsedSinceStart;
                if (totalSeconds <= 0) {
                    totalSeconds = 0;
                    isOvertime = true;
                    initialTotalSeconds = 0;
                    startTime = Date.now();
                }
            } else {
                totalSeconds = -elapsedSinceStart;
            }
            
            self.postMessage({ totalSeconds });
        }, 10);

    } else if (command === 'stop') {
        clearInterval(timer);
        timer = null;
    } else if (command === 'reset') {
        clearInterval(timer);
        timer = null;
        totalSeconds = value;
        isOvertime = false;
        self.postMessage({ totalSeconds });
    }
};
