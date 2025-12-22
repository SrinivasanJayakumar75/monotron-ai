import FeatureCard from "./featueCard";
import KeyboardShortcutsMockup from "./keyboardshortcut";
import NotificationsMockup from "./notification";
import TeamPlannerMockup from "./teamplanner";
import TimeBlockingMockup from "./timeblock";

const FeaturesSection = () => {
  return (
    <section className="bg-black px-4 py-16 md:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <h1 className="mb-6 font-display text-5xl font-normal leading-tight text-muted-foreground md:text-6xl lg:text-7xl">
            Easy Integration...
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            Integrate the agent into any front end frame work effortlessly. 
            Amazing opportunities for developers to integrate AI-Powered HelpDesk Software into their sites.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Keyboard shortcuts - spans 1 column */}
          <FeatureCard
            title="Integrations."
            description="Work efficiently with instant access to the AI Agent."
            className="min-h-[400px]"
            glowPosition="top"
          >
            <KeyboardShortcutsMockup />
          </FeatureCard>

          {/* Team Planner - spans 1 column */}
          <FeatureCard
            title="Monitor Conversations."
            description="Keep track of the bigger picture by viewing all individual conversations in one centralized team dashboard."
            className="min-h-[400px]"
            glowPosition="top"
          >
            <TeamPlannerMockup />
          </FeatureCard>

          {/* Time-blocking - spans more width */}
          <FeatureCard
            title="Send Email."
            description="Update your customer when the problem is resolved."
            className="min-h-[400px] md:col-span-1"
            glowPosition="top"
          >
            <TimeBlockingMockup />
          </FeatureCard>

          {/* Notifications - square card */}
          <FeatureCard
            title="Knowledge Base."
            description="Customize the Agent respone with the knowledge base feature."
            className="min-h-[400px]"
            glowPosition="center"
          >
            <NotificationsMockup />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
