
import { Users, FileText, Zap, Sparkles, Plug, ArrowBigRight } from "lucide-react";
import FeatureCard from "./scrollscreenFeatureCard";
import SplitScrollLayout from "./splitScreenlayout";

const FeatureIn = () => {
  const leftContent = (
    <div className="space-y-6 ">
      {/* Floating collaboration card */}
      <div className="relative animate-float">
        <div className="gradient-hero rounded-2xl p-6 shadow-card">
          {/* User badges */}
          <div className="relative mb-4">
            <span className="absolute -top-2 left-0 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-soft">
              John S.
            </span>
            <span className="absolute -top-2 right-4 inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground shadow-soft">
              Doe
            </span>
          </div>

          {/* Team text with selection effect */}
          <div className="mb-6 mt-8 flex items-center justify-center">
            <div className="relative">
              <span className="font-display text-4xl font-bold text-foreground">
                Send Email
              </span>
              <div className="absolute -inset-2 -z-10 rounded-lg border-2 border-dashed border-primary/40" />
              <div className="absolute -right-1 top-0 h-full w-0.5 animate-pulse bg-foreground" />
            </div>
          </div>

          {/* Feature description */}
          <div className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Unresolved
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Generate Customized Outputs powerful AI responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const rightContent = (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="space-y-6 pt-8" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-start gap-4">
          <h1 className="font-display text-4xl font-bold leading-tight text-foreground lg:text-5xl">
            Platform That Works
            <br />
            <span className="gradient-text">While You Sleep</span>
          </h1>
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/20">
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
          </div>
        </div>

        <p className="text-lg leading-relaxed text-muted-foreground">
          Automate up to 80% of customer inquiries with intelligent AI chatbots. Provide instant, accurate responses 24/7 across all channels. Start today.
        </p>

        <p className="text-base leading-relaxed text-foreground">
          <strong>Why Choose AI-Powered Customer Support?</strong> Modern customers expect instant answers. Our AI support platform delivers immediate, accurate responses to customer queries around the clock. Reduce wait times from hours to seconds while maintaining the human touch your customers value
        </p>
      </section>

      {/* Feature Cards */}
      <section className="space-y-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Core Features
        </h2>
        <div className="grid gap-6">
          <FeatureCard
            title="Dashboard Conversations"
            description="Chat with your customers not only with AI also from the dashboard."
            icon={<Users className="h-5 w-5" />}
            badges={["Unresolved", "Resolved", "Escalated"]}
          />
          <FeatureCard
            title="Knowledge Base"
            description="Generate Custom responses with the knowledge base feature."
            icon={<FileText className="h-5 w-5" />}
            badges={["FAQ", "Product Details"]}
          />
          <FeatureCard
            title="Fast and Easy Integrations"
            description="Built for speed. Instant loading, quick responses, and smooth performance across all devices."
            icon={<Zap className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Additional Content */}
      <section className="space-y-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Enterprise Ready
        </h2>
        <div className="grid gap-6">
          <FeatureCard
            title="Voice Assistant"
            description="Easy and fast integration of a  voice software that helps scaling business."
            icon={<Plug className="h-5 w-5" />}
            badges={["Easy", "Fast"]}
          />
          <FeatureCard
            title="Escalate"
            description="Switch from AI to human chat Any time easily."
            icon={<ArrowBigRight className="h-5 w-5" />}
          />
          <FeatureCard
            title="AI Powered"
            description="Leverage AI to answer clients, generate custom responses, and automate repetitive tasks."
            icon={<Sparkles className="h-5 w-5" />}
            badges={["AI"]}
          />
        </div>
      </section>

      {/* Spacer for scroll effect */}
      <div className="h-32" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SplitScrollLayout leftContent={leftContent} rightContent={rightContent} />
    </div>
  );
};

export default FeatureIn;
