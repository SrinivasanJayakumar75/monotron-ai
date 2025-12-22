import { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  badges?: string[];
}

const FeatureCard = ({ title, description, icon, badges }: FeatureCardProps) => {
  return (
    <div className="group relative rounded-2xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-card opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative z-10">
        {icon && (
          <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        )}
        
        {badges && badges.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
