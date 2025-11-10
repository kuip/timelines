package utils

import (
	"fmt"
	"math/big"
	"time"

	"github.com/shopspring/decimal"
)

// Time constants
const (
	SecondsPerMinute = 60
	SecondsPerHour   = 3600
	SecondsPerDay    = 86400
	SecondsPerYear   = 365.25 * SecondsPerDay // Average including leap years

	// Big Bang occurred approximately 13.8 billion years ago
	BigBangYearsAgo = 13_800_000_000

	// Calculate seconds from Big Bang to Unix Epoch (1970-01-01)
	// Unix Epoch is 13.8B years - 54 years from Big Bang (as of 2024)
	UnixEpochYearsAfterBigBang = BigBangYearsAgo - 1970
)

var (
	// UnixEpochInTimeline represents Unix Epoch in timeline seconds
	// This is approximately 435,456,000,000,000,000 seconds
	UnixEpochInTimeline = decimal.NewFromFloat(UnixEpochYearsAfterBigBang * SecondsPerYear)

	// Zero represents the Big Bang moment
	TimelineBigBang = decimal.Zero
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

// TimelineTime represents a point in time on the universal timeline
type TimelineTime struct {
	Seconds         decimal.Decimal // Seconds since Big Bang
	Precision       PrecisionLevel
	UncertaintyRange *decimal.Decimal // Optional ± range in seconds
}

// UnixToTimeline converts a Unix timestamp to timeline seconds
func UnixToTimeline(unixSeconds int64) decimal.Decimal {
	unix := decimal.NewFromInt(unixSeconds)
	return UnixEpochInTimeline.Add(unix)
}

// TimeToTimeline converts a Go time.Time to timeline seconds
func TimeToTimeline(t time.Time) decimal.Decimal {
	return UnixToTimeline(t.Unix())
}

// TimelineToUnix converts timeline seconds to Unix timestamp
// Returns error if the timeline value is outside Unix timestamp range
func TimelineToUnix(timelineSeconds decimal.Decimal) (int64, error) {
	unix := timelineSeconds.Sub(UnixEpochInTimeline)

	// Check if it's within Unix timestamp range (roughly -2^31 to 2^31)
	minUnix := decimal.NewFromInt(-2147483648)
	maxUnix := decimal.NewFromInt(2147483647)

	if unix.LessThan(minUnix) || unix.GreaterThan(maxUnix) {
		return 0, fmt.Errorf("timeline value %s is outside Unix timestamp range", timelineSeconds.String())
	}

	return unix.IntPart(), nil
}

// TimelineToTime converts timeline seconds to Go time.Time
// Returns error if outside time.Time range
func TimelineToTime(timelineSeconds decimal.Decimal) (time.Time, error) {
	unixSeconds, err := TimelineToUnix(timelineSeconds)
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(unixSeconds, 0), nil
}

// YearsAgoToTimeline converts "years ago" to timeline seconds
// For example: 13.8 billion years ago = 0 (Big Bang)
// 0 years ago = current time
func YearsAgoToTimeline(yearsAgo float64) decimal.Decimal {
	now := TimeToTimeline(time.Now())
	yearsInSeconds := decimal.NewFromFloat(yearsAgo * SecondsPerYear)
	return now.Sub(yearsInSeconds)
}

// YearsFromBigBangToTimeline converts years since Big Bang to timeline seconds
func YearsFromBigBangToTimeline(years float64) decimal.Decimal {
	return decimal.NewFromFloat(years * SecondsPerYear)
}

// TimelineToBigIntSeconds converts timeline decimal to big.Int (seconds only, no fractional part)
func TimelineToBigIntSeconds(timelineSeconds decimal.Decimal) *big.Int {
	return timelineSeconds.BigInt()
}

// FormatTimelineForDisplay formats timeline seconds for human-readable display
func FormatTimelineForDisplay(timelineSeconds decimal.Decimal) string {
	// Convert to years for easier reading
	years := timelineSeconds.Div(decimal.NewFromFloat(SecondsPerYear))

	if years.LessThan(decimal.NewFromInt(1)) {
		// Less than 1 year - show in days, hours, etc.
		days := timelineSeconds.Div(decimal.NewFromFloat(SecondsPerDay))
		if days.LessThan(decimal.NewFromInt(1)) {
			return fmt.Sprintf("%.2f seconds", timelineSeconds.InexactFloat64())
		}
		return fmt.Sprintf("%.2f days", days.InexactFloat64())
	}

	if years.LessThan(decimal.NewFromInt(1000)) {
		return fmt.Sprintf("%.2f years", years.InexactFloat64())
	}

	if years.LessThan(decimal.NewFromInt(1_000_000)) {
		thousandYears := years.Div(decimal.NewFromInt(1000))
		return fmt.Sprintf("%.2f thousand years", thousandYears.InexactFloat64())
	}

	if years.LessThan(decimal.NewFromInt(1_000_000_000)) {
		millionYears := years.Div(decimal.NewFromInt(1_000_000))
		return fmt.Sprintf("%.2f million years", millionYears.InexactFloat64())
	}

	billionYears := years.Div(decimal.NewFromInt(1_000_000_000))
	return fmt.Sprintf("%.2f billion years", billionYears.InexactFloat64())
}

// NewTimelineTime creates a new TimelineTime instance
func NewTimelineTime(seconds decimal.Decimal, precision PrecisionLevel) TimelineTime {
	return TimelineTime{
		Seconds:   seconds,
		Precision: precision,
	}
}

// WithUncertainty adds an uncertainty range to a TimelineTime
func (tt TimelineTime) WithUncertainty(plusMinusSeconds decimal.Decimal) TimelineTime {
	tt.UncertaintyRange = &plusMinusSeconds
	return tt
}

// IsValid checks if the timeline time is valid (non-negative)
func (tt TimelineTime) IsValid() bool {
	return tt.Seconds.GreaterThanOrEqual(TimelineBigBang)
}

// IsFuture checks if the timeline time is in the future
func (tt TimelineTime) IsFuture() bool {
	now := TimeToTimeline(time.Now())
	return tt.Seconds.GreaterThan(now)
}

// String returns a string representation of the TimelineTime
func (tt TimelineTime) String() string {
	base := fmt.Sprintf("%s since Big Bang (%s precision)",
		FormatTimelineForDisplay(tt.Seconds),
		tt.Precision)

	if tt.UncertaintyRange != nil {
		base += fmt.Sprintf(" ±%s", FormatTimelineForDisplay(*tt.UncertaintyRange))
	}

	return base
}
