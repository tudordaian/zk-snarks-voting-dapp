export function getTimeUntil(targetTimestamp: number): string {
    const now = Date.now();
    const target = targetTimestamp * 1000; 
    const diff = target - now;

    if (diff <= 0) {
        return "Time has passed";
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} and ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
}

export function getElectionStatus(election: { active: boolean; finalized: boolean; startTime: number; endTime: number }): string {
    const now = Date.now() / 1000;

    if (election.finalized) return "Finalized";
    if (election.active) return "Active";
    if (now < election.startTime) return "Scheduled";
    if (now >= election.startTime && now < election.endTime) return "Ready to Start";
    return "Expired";
}

export function getElectionTimingMessage(election: { active: boolean; finalized: boolean; startTime: number; endTime: number }): string {
    const now = Date.now() / 1000;

    if (election.finalized) {
        return "This election has ended.";
    } else if (election.active) {
        if (now >= election.endTime) {
            return "This election has passed its end time. It will be automatically finalized soon.";
        } else {
            const timeLeft = getTimeUntil(election.endTime);
            return `🕗 Active election, ends in ${timeLeft}.`;
        }
    } else if (now < election.startTime) {
        const timeUntilStart = getTimeUntil(election.startTime);
        return `🕗 Election starts in ${timeUntilStart}.`;
    } else if (now >= election.startTime && now < election.endTime) {
        return "This election is ready to be started by an admin.";
    } else {
        return "This election has expired and cannot be started.";
    }
}
