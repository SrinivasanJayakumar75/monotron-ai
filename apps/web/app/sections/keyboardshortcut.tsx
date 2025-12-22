import { Search, X } from "lucide-react";

const KeyboardShortcutsMockup = () => {
  return (
    <div className="relative h-full min-h-[280px] bg-cover bg-center bg-no-repeat"
    style={{ backgroundImage: "url('/herofront.png')"}}>
      {/* Command palette mockup */}
      <div className="absolute left-1/2 top-1/2 w-[280px] -translate-x-1/2 -translate-y-1/2 transform">
        <div className="rounded-xl border border-surface-elevated bg-card/80 shadow-2xl backdrop-blur-sm">
          {/* Search header */}
          <div className="flex items-center gap-3 border-b border-surface-elevated px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Integrations...</span>
            <X className="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Actions list */}
          <div className="p-2">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              React
            </p>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-elevated">
                <span className="text-sm text-card-foreground">1.Create Account</span>
                <kbd className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted-foreground">1.</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-elevated">
                <span className="text-sm text-card-foreground">2.Go to integrations</span>
                <kbd className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted-foreground">2.</kbd>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-elevated">
                <span className="text-sm text-card-foreground">3.Copy and paste the code into your website.</span>
                <kbd className="rounded bg-surface-elevated px-2 py-0.5 text-xs text-muted-foreground">3.</kbd>
              </div>
            </div>
          </div>
        </div>
        
        {/* Keyboard hint at bottom */}
        <div className="mt-6 flex justify-center gap-1">
          {['C', 'U', 'S', 'T', 'O', 'M', 'E', 'R'].map((key) => (
            <kbd 
              key={key}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-surface-elevated bg-card/50 text-xs text-muted-foreground shadow-sm"
            >
              {key}
            </kbd>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsMockup;
