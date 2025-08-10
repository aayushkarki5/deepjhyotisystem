// utils/categoryCalculator.js
// Pure helpers for deciding user category / activity based on attendance data.

const getCategoryByAttendance = (totalAttendanceDays = 0) => {
  const n = Number(totalAttendanceDays) || 0;
  // thresholds match your User model hook (>=75 -> A, >35 -> B, else C)
  if (n >= 75) return 'A';
  if (n > 35) return 'B';
  return 'C';
};

/**
 * Determine whether a member is "Active" for a given year.
 * - attendanceRecords: array of { year, month, status } (month: 1-12)
 * - definition used here: Active means they had at least one 'Present' in each month of the year.
 *   (This matches the comment you had earlier in the User model.)
 */
const isActiveMemberByMonthlyAttendance = (attendanceRecords = [], year = new Date().getFullYear()) => {
  if (!Array.isArray(attendanceRecords)) return false;
  const monthsWithPresence = new Set(
    attendanceRecords
      .filter(r => Number(r.year) === Number(year) && r.status === 'Present' && r.month)
      .map(r => Number(r.month))
  );
  return monthsWithPresence.size === 12;
};

const attendanceRate = (presentCount = 0, totalPossible = 0) => {
  presentCount = Number(presentCount) || 0;
  totalPossible = Number(totalPossible) || 0;
  if (totalPossible === 0) return 0;
  return +( (presentCount / totalPossible) * 100 ).toFixed(2);
};

module.exports = {
  getCategoryByAttendance,
  isActiveMemberByMonthlyAttendance,
  attendanceRate
};
