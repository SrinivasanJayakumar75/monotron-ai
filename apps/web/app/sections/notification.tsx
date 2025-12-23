import { LibrarySquareIcon } from "lucide-react";

const NotificationsMockup = () => {
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/herofront.png')"}}>
      {/* Animated rings background */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3, 4].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-glow-amber/10"
            style={{
              width: `${ring * 80}px`,
              height: `${ring * 80}px`,
              animation: `pulse-glow ${2 + ring * 0.5}s ease-in-out infinite`,
              animationDelay: `${ring * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Spiral/vortex gradient effect */}
      <div className="absolute inset-0 gradient-radial-center opacity-80" />
      
      {/* Central notification bell */}
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card/80 shadow-xl backdrop-blur-sm">
          <LibrarySquareIcon className="h-7 w-7 text-card-foreground" />
        </div>
        
        {/* Notification badge */}
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-lg">
          AI
        </div>
      </div>
      
      {/* Floating notification dots */}
      <div 
        className="absolute animate-float"
        style={{ top: '20%', right: '25%', animationDelay: '0s' }}
      >
        <div className="h-2 w-2 rounded-full bg-primary/60" />
      </div>
      <div 
        className="absolute animate-float"
        style={{ bottom: '30%', left: '20%', animationDelay: '1s' }}
      >
        <div className="h-3 w-3 rounded-full bg-glow-orange/50" />
      </div>
      <div 
        className="absolute animate-float"
        style={{ top: '40%', left: '15%', animationDelay: '2s' }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
      </div>
    </div>
  );
};

export default NotificationsMockup;
