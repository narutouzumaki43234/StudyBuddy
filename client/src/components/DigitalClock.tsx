import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-2xl border border-border/50 shadow-lg shadow-black/20">
      <div className="text-4xl font-mono font-bold tracking-widest text-primary drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-sm text-muted-foreground mt-2 font-medium tracking-wide uppercase">
        {format(time, 'EEEE, MMMM do')}
      </div>
    </div>
  );
}
