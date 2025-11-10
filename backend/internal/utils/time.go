package utils

import (
	"fmt"
	"time"
)

// Time constants
const (
	SecondsPerMinute = 60
	SecondsPerHour   = 3600
	SecondsPerDay    = 86400
	SecondsPerYear   = 365.25 * SecondsPerDay // Average including leap years

	// Big Bang occurred approximately 13.8 billion years ago
	BigBangYearsAgo = 13_800_000_000

	// Unix Epoch origin: January 1, 1970
	// Seconds from Big Bang to Unix Epoch = (13.8B - 55 years) * seconds per year
	BigBangToUnixEpochSeconds = int64((BigBangYearsAgo - 55) * SecondsPerYear)
)

// PrecisionLevel represents the precision of a timestamp
type PrecisionLevel string

const (
	PrecisionNanosecond     PrecisionLevel = "nanosecond"
	PrecisionMicrosecond    PrecisionLevel = "microsecond"
	PrecisionMillisecond    PrecisionLevel = "millisecond"
	PrecisionSecond         PrecisionLevel = "second"
	PrecisionMinute         PrecisionLevel = "minute"
	PrecisionHour           PrecisionLevel = "hour"
	PrecisionDay            PrecisionLevel = "day"
	PrecisionYear           PrecisionLevel = "year"
	PrecisionThousandYears  PrecisionLevel = "thousand_years"
	PrecisionMillionYears   PrecisionLevel = "million_years"
	PrecisionBillionYears   PrecisionLevel = "billion_years"
)

// TimelineTime represents a point in time with both Unix seconds and Big Bang display info
type TimelineTime struct {
	UnixSeconds      int64           // Seconds since Unix Epoch (1970-01-01)
	UnixNanos        int32           // Nanoseconds (0-999999999)
	Precision        PrecisionLevel
	UncertaintyRange *int64          // Optional ± range in seconds
}

// ToTime converts to Go time.Time
func (tt TimelineTime) ToTime() time.Time {
	return time.Unix(tt.UnixSeconds, int64(tt.UnixNanos))
}

// FromTime creates TimelineTime from Go time.Time
func FromTime(t time.Time) TimelineTime {
	return TimelineTime{
		UnixSeconds: t.Unix(),
		UnixNanos:   int32(t.Nanosecond()),
	}
}

// YearsAgoToUnixSeconds converts "years ago" to Unix seconds
// For example: 0 years ago = now, 1 year ago = now - 1 year in seconds
func YearsAgoToUnixSeconds(yearsAgo float64) int64 {
	now := time.Now().Unix()
	yearsInSeconds := int64(yearsAgo * SecondsPerYear)
	return now - yearsInSeconds
}

// YearsBeforeBigBangToUnixSeconds converts years before Big Bang reference (13.8B years ago) to Unix seconds
// For example: 13.8 billion years ago (Big Bang) = very negative number
// 0 years ago from Big Bang = Big Bang date in Unix seconds
func YearsBeforeBigBangToUnixSeconds(yearsBeforeBigBang float64) int64 {
	// Big Bang is ~13.8 billion years ago from year 0
	// In Unix epoch (1970), we subtract the Big Bang offset from now
	now := time.Now().Unix()
	yearsInSeconds := int64(yearsBeforeBigBang * SecondsPerYear)
	return now - BigBangToUnixEpochSeconds - yearsInSeconds
}

// FormatTimelineForDisplay formats Unix seconds as normally-readable format
// For historical dates (year 1-9999), shows Gregorian calendar
// For prehistoric times, shows "X ago" format (never shows "years from Big Bang")
func FormatTimelineForDisplay(unixSeconds int64, nanos int32) string {
	t := time.Unix(unixSeconds, int64(nanos))
	year := t.Year()

	// Check if within Gregorian calendar range
	if year > 0 && year < 10000 {
		// Normal calendar date
		return t.Format("January 2, 2006 15:04")
	}

	// For dates before year 0 (B.C. or before), calculate "ago" format
	if year <= 0 {
		now := time.Now()
		diff := now.Unix() - unixSeconds

		// Calculate how many years ago
		yearsAgo := float64(diff) / SecondsPerYear

		if yearsAgo < 1 {
			// Less than a year ago
			daysAgo := float64(diff) / SecondsPerDay
			if daysAgo < 1 {
				return fmt.Sprintf("%.0f seconds ago", float64(diff))
			}
			return fmt.Sprintf("%.1f days ago", daysAgo)
		}

		if yearsAgo < 1000 {
			return fmt.Sprintf("%.0f years ago", yearsAgo)
		}

		if yearsAgo < 1_000_000 {
			return fmt.Sprintf("%.1f thousand years ago", yearsAgo/1000)
		}

		if yearsAgo < 1_000_000_000 {
			return fmt.Sprintf("%.1f million years ago", yearsAgo/1_000_000)
		}

		return fmt.Sprintf("%.2f billion years ago", yearsAgo/1_000_000_000)
	}

	// Fallback for far future
	return t.Format("January 2, 2006 15:04")
}

// NewTimelineTime creates a new TimelineTime instance
func NewTimelineTime(unixSeconds int64, nanos int32, precision PrecisionLevel) TimelineTime {
	return TimelineTime{
		UnixSeconds: unixSeconds,
		UnixNanos:   nanos,
		Precision:   precision,
	}
}

// WithUncertainty adds an uncertainty range to a TimelineTime
func (tt TimelineTime) WithUncertainty(plusMinusSeconds int64) TimelineTime {
	tt.UncertaintyRange = &plusMinusSeconds
	return tt
}

// IsFuture checks if the timeline time is in the future
func (tt TimelineTime) IsFuture() bool {
	now := time.Now().Unix()
	return tt.UnixSeconds > now
}

// String returns a string representation of the TimelineTime
func (tt TimelineTime) String() string {
	base := fmt.Sprintf("%s (%s precision)",
		FormatTimelineForDisplay(tt.UnixSeconds, tt.UnixNanos),
		tt.Precision)

	if tt.UncertaintyRange != nil {
		base += fmt.Sprintf(" ±%d seconds", *tt.UncertaintyRange)
	}

	return base
}
