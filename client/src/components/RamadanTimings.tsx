import { useEffect, useState } from 'react';
import { Sunrise, Sunset, Clock, Moon, Star } from 'lucide-react';

interface RamadanTiming {
  date: string;
  sehri: string;
  iftar: string;
  hijriDate: string;
}

// Ramadan 2026 timings for Dhaka, Bangladesh (Islamic University of Technology location)
const ramadanTimings2026: RamadanTiming[] = [
  { date: '2026-02-18', sehri: '05:15 AM', iftar: '05:55 PM', hijriDate: '1 Ramadan 1447' },
  { date: '2026-02-19', sehri: '05:15 AM', iftar: '05:56 PM', hijriDate: '2 Ramadan 1447' },
  { date: '2026-02-20', sehri: '05:14 AM', iftar: '05:56 PM', hijriDate: '3 Ramadan 1447' },
  { date: '2026-02-21', sehri: '05:14 AM', iftar: '05:57 PM', hijriDate: '4 Ramadan 1447' },
  { date: '2026-02-22', sehri: '05:14 AM', iftar: '05:57 PM', hijriDate: '5 Ramadan 1447' },
  { date: '2026-02-23', sehri: '05:13 AM', iftar: '05:58 PM', hijriDate: '6 Ramadan 1447' },
  { date: '2026-02-24', sehri: '05:13 AM', iftar: '05:58 PM', hijriDate: '7 Ramadan 1447' },
  { date: '2026-02-25', sehri: '05:13 AM', iftar: '05:59 PM', hijriDate: '8 Ramadan 1447' },
  { date: '2026-02-26', sehri: '05:12 AM', iftar: '05:59 PM', hijriDate: '9 Ramadan 1447' },
  { date: '2026-02-27', sehri: '05:12 AM', iftar: '06:00 PM', hijriDate: '10 Ramadan 1447' },
  { date: '2026-02-28', sehri: '05:12 AM', iftar: '06:00 PM', hijriDate: '11 Ramadan 1447' },
  { date: '2026-03-01', sehri: '05:11 AM', iftar: '06:01 PM', hijriDate: '12 Ramadan 1447' },
  { date: '2026-03-02', sehri: '05:11 AM', iftar: '06:01 PM', hijriDate: '13 Ramadan 1447' },
  { date: '2026-03-03', sehri: '05:10 AM', iftar: '06:02 PM', hijriDate: '14 Ramadan 1447' },
  { date: '2026-03-04', sehri: '05:10 AM', iftar: '06:02 PM', hijriDate: '15 Ramadan 1447' },
  { date: '2026-03-05', sehri: '05:10 AM', iftar: '06:03 PM', hijriDate: '16 Ramadan 1447' },
  { date: '2026-03-06', sehri: '05:09 AM', iftar: '06:03 PM', hijriDate: '17 Ramadan 1447' },
  { date: '2026-03-07', sehri: '05:09 AM', iftar: '06:04 PM', hijriDate: '18 Ramadan 1447' },
  { date: '2026-03-08', sehri: '05:08 AM', iftar: '06:04 PM', hijriDate: '19 Ramadan 1447' },
  { date: '2026-03-09', sehri: '05:08 AM', iftar: '06:05 PM', hijriDate: '20 Ramadan 1447' },
  { date: '2026-03-10', sehri: '05:08 AM', iftar: '06:05 PM', hijriDate: '21 Ramadan 1447' },
  { date: '2026-03-11', sehri: '05:07 AM', iftar: '06:06 PM', hijriDate: '22 Ramadan 1447' },
  { date: '2026-03-12', sehri: '05:07 AM', iftar: '06:06 PM', hijriDate: '23 Ramadan 1447' },
  { date: '2026-03-13', sehri: '05:06 AM', iftar: '06:07 PM', hijriDate: '24 Ramadan 1447' },
  { date: '2026-03-14', sehri: '05:06 AM', iftar: '06:07 PM', hijriDate: '25 Ramadan 1447' },
  { date: '2026-03-15', sehri: '05:05 AM', iftar: '06:08 PM', hijriDate: '26 Ramadan 1447' },
  { date: '2026-03-16', sehri: '05:05 AM', iftar: '06:08 PM', hijriDate: '27 Ramadan 1447' },
  { date: '2026-03-17', sehri: '05:05 AM', iftar: '06:09 PM', hijriDate: '28 Ramadan 1447' },
  { date: '2026-03-18', sehri: '05:04 AM', iftar: '06:09 PM', hijriDate: '29 Ramadan 1447' },
  { date: '2026-03-19', sehri: '05:04 AM', iftar: '06:10 PM', hijriDate: '30 Ramadan 1447' },
];

export function RamadanTimings() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayTiming, setTodayTiming] = useState<RamadanTiming | null>(null);
  const [nextEvent, setNextEvent] = useState<'sehri' | 'iftar' | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Get today's date in YYYY-MM-DD format
    const today = currentTime.toISOString().split('T')[0];
    
    // Find today's timing
    const timing = ramadanTimings2026.find(t => t.date === today);
    setTodayTiming(timing || null);

    if (timing) {
      // Parse sehri and iftar times
      const sehriTime = parseTime(timing.sehri);
      const iftarTime = parseTime(timing.iftar);

      // Determine next event and calculate countdown
      const now = currentTime.getTime();
      
      if (now < sehriTime.getTime()) {
        setNextEvent('sehri');
        setCountdown(getCountdown(now, sehriTime.getTime()));
      } else if (now < iftarTime.getTime()) {
        setNextEvent('iftar');
        setCountdown(getCountdown(now, iftarTime.getTime()));
      } else {
        setNextEvent(null);
        setCountdown('');
      }
    }
  }, [currentTime]);

  const parseTime = (timeStr: string): Date => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    const date = new Date(currentTime);
    let hour24 = hours;
    
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    date.setHours(hour24, minutes, 0, 0);
    return date;
  };

  const getCountdown = (now: number, target: number): string => {
    const diff = target - now;
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!todayTiming) {
    return null;
  }

  return (
    <div className="ramadan-timings-container">
      {/* Decorative Stars */}
      <div className="ramadan-stars">
        <Star className="star star-1" />
        <Star className="star star-2" />
        <Star className="star star-3" />
        <Star className="star star-4" />
      </div>

      {/* Main Card */}
      <div className="ramadan-card">
        {/* Header */}
        <div className="ramadan-header">
          <Moon className="w-8 h-8 text-yellow-500" style={{ filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' }} />
          <div className="text-center">
            <h2 className="text-2xl font-bold" style={{ 
              background: 'linear-gradient(135deg, #d4af37 0%, #f4e5a1 50%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Ramadan Mubarak
            </h2>
            <p className="text-sm" style={{ color: 'rgba(212, 175, 55, 0.8)' }}>{todayTiming.hijriDate}</p>
          </div>
          <Moon className="w-8 h-8 text-yellow-500" style={{ filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' }} />
        </div>

        {/* Timings Grid */}
        <div className="ramadan-timings-grid">
          {/* Sehri Card */}
          <div className={`timing-card ${nextEvent === 'sehri' ? 'timing-card-active' : ''}`}>
            <div className="timing-icon-wrapper">
              <Sunrise className="w-8 h-8 text-yellow-500" style={{ filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))' }} />
            </div>
            <div className="timing-content">
              <h3 className="timing-label">Sehri Ends</h3>
              <p className="timing-value">{todayTiming.sehri}</p>
              {nextEvent === 'sehri' && countdown && (
                <div className="countdown-badge">
                  <Clock className="w-4 h-4" />
                  <span>{countdown}</span>
                </div>
              )}
            </div>
          </div>

          {/* Iftar Card */}
          <div className={`timing-card ${nextEvent === 'iftar' ? 'timing-card-active' : ''}`}>
            <div className="timing-icon-wrapper">
              <Sunset className="w-8 h-8 text-yellow-500" style={{ filter: 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.5))' }} />
            </div>
            <div className="timing-content">
              <h3 className="timing-label">Iftar Time</h3>
              <p className="timing-value">{todayTiming.iftar}</p>
              {nextEvent === 'iftar' && countdown && (
                <div className="countdown-badge">
                  <Clock className="w-4 h-4" />
                  <span>{countdown}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Time */}
        <div className="current-time">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span className="text-sm">
            Current Time: {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
        </div>

        {/* Footer Message */}
        <div className="ramadan-footer">
          <p className="text-xs text-center">
            May Allah accept your fasting and prayers
          </p>
        </div>
      </div>
    </div>
  );
}
