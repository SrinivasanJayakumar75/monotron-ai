import { Plus, MoreHorizontal, Check, MessageSquare, Paperclip, User, ArrowBigRight, ArrowUp } from "lucide-react";

const TeamPlannerMockup = () => {
  return (
    <div className="relative h-full min-h-[280px] bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/heroside.png')"}}>
      <div className="flex gap-4 overflow-hidden">
        {/* Today's tasks column */}
        <div className="w-[200px] flex-shrink-0 rounded-xl border border-surface-elevated bg-card/60 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">Conversations</span>
            <Plus className="h-4 w-4 text-primary" />
          </div>
          
          {/* High priority task */}
          <div className="mb-3 rounded-lg border border-surface-elevated bg-surface/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-destructive/20 px-2 py-0.5 text-[10px] font-medium text-destructive">Unresolved</span>
              <MoreHorizontal className="ml-auto h-3 w-3 text-muted-foreground" />
            </div>
            <p className="mb-3 text-xs leading-relaxed text-card-foreground">
              What are the pricing plans?.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Dec 22</span>
                <span className="flex items-center gap-1">
                  <ArrowBigRight className="h-3 w-3" /> 2
                </span>
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> 1
                </span>
              </div>
              <div className="flex -space-x-2">
                <div className="h-5 w-5 rounded-full bg-primary/80" />
                <div className="h-5 w-5 rounded-full bg-glow-orange" />
                <div className="h-5 w-5 rounded-full bg-muted" />
              </div>
            </div>
          </div>
          
          {/* Medium priority task */}
          <div className="rounded-lg border border-surface-elevated bg-surface/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">Escalated</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-card-foreground">
              Can i talk to a human.
              
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Dec 22</span>
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> 4
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> 3
              </span>
            </div>
          </div>
        </div>
        
        {/* Create new task panel (faded) */}
        <div className="w-[160px] flex-shrink-0 rounded-xl border border-surface-elevated/50 bg-card/30 p-3 opacity-60">
          <span className="text-sm font-medium text-card-foreground/70">John Doe</span>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">JonDoe@email.com</p>
          </div>
        </div>
      </div>
      
      {/* Decorative checkmark */}
      <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
        <Check className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
};

export default TeamPlannerMockup;
