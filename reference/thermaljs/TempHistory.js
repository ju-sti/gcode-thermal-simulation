class TempHistory {
    constructor() {
        this.history = null;
        this.buffer = null;
        this.nRecords = 0;
    }

    initialize(depositTime, initialTemp) {
        if (TempHistory.KEEP_HISTORY) {
            this.history = [];
        }
        this.buffer = new TimeTemp(depositTime, initialTemp);
        this.nRecords++;
    }

    updateTemperature(time, temp) {
        if (TempHistory.KEEP_HISTORY) {
            var size = this.history.length;
            if (size != 0 && time - this.history[size - 1].time <= TempHistory.TIME_SAMPLE_RATE && Math.abs(this.history[size - 1].temp - temp) <= TempHistory.TEMPERATURE_SAMPLE_RATE) {
                this.buffer = new TimeTemp(time, temp); // replace buffer with new time-temp pair
            } else {
                this.history.push(this.buffer);
                this.buffer = new TimeTemp(time, temp);
                this.nRecords++;
            }
        } else {
            this.history = new TimeTemp(time, temp);
        }
    }

    getLatestTime() {
        return this.buffer.time;
    }

    getLatestTemp() {
        return this.buffer.temp;
    }

    getTempHistory() {
        this.history.push(this.buffer);
        return this.history;
    }

    size() {
        return this.nRecords;
    }


} // end TempHistory

TempHistory.KEEP_HISTORY = true;
// time sample and temperature sample are used for reduce storage
TempHistory.TIME_SAMPLE_RATE = 0.3;
TempHistory.TEMPERATURE_SAMPLE_RATE = 8.0;
