import moment from 'moment';

/**
 * Parses exam date + startTime string into a valid moment object.
 * Supports 12-hour (10:00 AM) and 24-hour (10:00) formats.
 */
export const parseExamStartMoment = (date, startTimeStr) => {
  if (!date || !startTimeStr) return null;
  const dateStr = moment(date).format('YYYY-MM-DD');
  const cleanTime = String(startTimeStr).trim();

  const m = moment(`${dateStr} ${cleanTime}`, [
    'YYYY-MM-DD h:mm A',
    'YYYY-MM-DD hh:mm A',
    'YYYY-MM-DD H:mm',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD h:mm:ss A',
    'YYYY-MM-DD HH:mm:ss'
  ]);

  return m.isValid() ? m : null;
};

/**
 * Parses exam date + endTime string into a valid moment object.
 */
export const parseExamEndMoment = (date, endTimeStr) => {
  if (!date || !endTimeStr) return null;
  const dateStr = moment(date).format('YYYY-MM-DD');
  const cleanTime = String(endTimeStr).trim();

  const m = moment(`${dateStr} ${cleanTime}`, [
    'YYYY-MM-DD h:mm A',
    'YYYY-MM-DD hh:mm A',
    'YYYY-MM-DD H:mm',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD h:mm:ss A',
    'YYYY-MM-DD HH:mm:ss'
  ]);

  return m.isValid() ? m.add(59, 'seconds').add(999, 'ms') : null;
};

/**
 * Formats total seconds into MM:SS or HH:MM:SS format
 */
export const formatCountdownTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) return '00:00';
  const safe = Math.floor(totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Evaluates a single timetable row for 15-minute countdown window or active state.
 * Returns: { isCountdown: boolean, isLive: boolean, remainingSeconds: number, startMoment }
 */
export const getRowCountdownInfo = (item, schedule) => {
  const isAbsent = Boolean(item?.isAbsent);
  const isSubmitted = Boolean(item?.isSubmitted);

  // If marked absent or submitted, countdown is inactive
  if (isAbsent || isSubmitted) {
    return {
      isCountdown: false,
      isLive: false,
      isAbsent,
      isSubmitted,
      remainingSeconds: 0
    };
  }

  // If already live according to backend
  if (item?.status === 'live' && item?.canOpen) {
    return {
      isCountdown: false,
      isLive: true,
      isAbsent: false,
      isSubmitted: false,
      remainingSeconds: 0
    };
  }

  const startMoment = parseExamStartMoment(item?.date, item?.startTime);
  if (!startMoment) {
    return {
      isCountdown: false,
      isLive: false,
      isAbsent,
      isSubmitted,
      remainingSeconds: 0
    };
  }

  const now = moment();
  const diffMs = startMoment.diff(now);
  const totalSeconds = Math.floor(diffMs / 1000);

  // 15 minutes window = 900 seconds
  const isCountdown = totalSeconds > 0 && totalSeconds <= 900;
  const isLiveNow = totalSeconds <= 0 && item?.status !== 'ended';

  return {
    isCountdown,
    isLive: isLiveNow || (item?.status === 'live' && item?.canOpen),
    isAbsent,
    isSubmitted,
    remainingSeconds: Math.max(0, totalSeconds),
    startMoment
  };
};

/**
 * Checks if ANY schedule/row for the student is currently in 15-min countdown OR live & unsubmitted.
 */
export const checkIsExamRestrictedActive = (schedules = []) => {
  if (!Array.isArray(schedules) || schedules.length === 0) return false;

  for (const schedule of schedules) {
    const timeTable = schedule.timeTable || [];
    for (const row of timeTable) {
      const info = getRowCountdownInfo(row, schedule);
      if ((info.isCountdown || info.isLive) && !info.isSubmitted && !info.isAbsent) {
        return true;
      }
    }
  }

  return false;
};
