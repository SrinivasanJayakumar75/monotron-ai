import { Plus, Copy, Users, Clock } from "lucide-react";

const TimeBlockingMockup = () => {
  const timeSlots = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];
  
  return (
    <div className="relative h-full min-h-[280px] bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/heroside.png')"}}>
      <div className="flex gap-4">
        {/* Time column */}
        <div className="flex flex-col gap-6 pt-8">
          {timeSlots.map((time) => (
            <span key={time} className="text-[10px] text-muted-foreground">{time}</span>
          ))}
        </div>
        
        {/* Calendar content */}
        <div className="relative flex-1">
          {/* Design meeting card */}
          <div className="absolute left-0 top-8 w-[180px] rounded-xl border border-surface-elevated bg-card/80 p-3 shadow-lg">
            <p className="mb-1 font-medium text-sm text-card-foreground">Send Email</p>
            <p className="mb-1 text-[10px] text-muted-foreground">JohDoe@email.com</p>
            <p className="mb-3 text-[10px] text-muted-foreground">Get client details in the dashboard easily.</p>
            
            <p className="mb-3 text-xs leading-relaxed text-card-foreground/80">
              Get information about the customer like country, email etc...
            </p>
            
            <button className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/20">
              <Plus className="h-3 w-3" />
              Send Email
            </button>
            
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                10 minutes before
              </span>
            </div>
            
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Pricing Details</span>
              <div className="ml-2 flex -space-x-1.5">
                <div className="h-4 w-4 rounded-full bg-primary" />
                <div className="h-4 w-4 rounded-full bg-glow-orange" />
                <div className="h-4 w-4 rounded-full bg-muted" />
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-surface-elevated text-[8px] text-muted-foreground">+5</div>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2 border-t border-surface-elevated pt-3">
              <span className="text-[10px] text-muted-foreground">Pricing?</span>
              <div className="flex gap-1">
                {['Yes', 'No', 'How'].map((option) => (
                  <button 
                    key={option}
                    className="rounded border border-surface-elevated px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-surface-elevated"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Secondary event */}
          <div className="absolute right-0 top-32 w-[120px] rounded-lg border border-primary/30 bg-primary/10 p-2">
            <p className="text-[10px] text-card-foreground">With one click escalate conversation from AI to Human</p>
            <p className="mt-1 text-[9px] text-muted-foreground">Escalated</p>
            <div className="mt-2 flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <div className="h-3 w-3 rounded-full bg-glow-orange" />
              <span className="text-[9px] text-muted-foreground">+2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeBlockingMockup;
