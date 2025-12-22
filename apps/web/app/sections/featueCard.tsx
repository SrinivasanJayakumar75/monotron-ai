import { cn } from "@workspace/ui/lib/utils";


interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  glowPosition?: "top" | "center" | "bottom-right";
}

const FeatureCard = ({ 
  title, 
  description, 
  children, 
  className,
  glowPosition = "top" 
}: FeatureCardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card p-3 transition-all duration-500 hover:scale-[1.02]",
        className
      )}
    >
      {/* Ambient glow effect */}
      <div 
        className={cn(
          "pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100",
          glowPosition === "top" && "gradient-radial-amber",
          glowPosition === "center" && "gradient-radial-center",
          glowPosition === "bottom-right" && "bg-gradient-to-tl from-glow-amber/20 via-transparent to-transparent"
        )}
      />
      
      {/* Content container */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Mockup area */}
        <div className="mb-6 flex-1">
          {children}
        </div>
        
        {/* Text content */}
        <div className="space-y-2">
          <h3 className="font-body text-lg font-semibold text-card-foreground">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-card-foreground/70">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
