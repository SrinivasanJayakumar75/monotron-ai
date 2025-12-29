import { Users, Heart, Target, Award, Sparkles, Zap, Rocket } from "lucide-react";
import Link from "next/link";

const values = [
  {
    icon: Heart,
    title: "Customer First",
    description: "Everything we build starts with our customers' needs and challenges.",
    gradient: "from-pink-500 to-rose-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Target,
    title: "Excellence",
    description: "We strive for excellence in every line of code and every interaction.",
    gradient: "from-purple-500 to-indigo-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "Great things happen when talented people work together.",
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Award,
    title: "Innovation",
    description: "We push boundaries and embrace new ideas to stay ahead.",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10",
  },
];

const About = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl opacity-15" />
        
        <div className="container px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium mb-6 animate-fade-up shadow-lg">
              <Sparkles className="w-4 h-4" />
              Launched December 2025
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-up">
              About <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">Monotron</span>
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed animate-fade-up" style={{ animationDelay: "0.1s" }}>
              We're building something new. Monotron launched in December 2025 with a simple belief: the best solutions come from reimagining how things work from the ground up.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container px-6">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Where We Are Today</h2>
                </div>
                <p className="leading-relaxed opacity-95">
                  We're still in our earliest days, refining our vision and laying the foundation for what's next. Right now, we're a small team focused on getting the details right before we scale.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <Rocket className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">What We're Working On</h2>
                </div>
                <p className="leading-relaxed opacity-95">
                  We're in stealth mode for now, but we're excited about the problem we're solving. When we're ready to share more, you'll be among the first to know.
                </p>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Why Monotron?</h2>
                </div>
                <p className="leading-relaxed opacity-95">
                  The name reflects our philosophy: focused, singular, deliberate. We're not trying to be everything to everyone. We're building one thing exceptionally well.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="container px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Our Story</h2>
              <p className="text-gray-600 text-lg">From idea to reality</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-5xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent mb-3">01</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">The Beginning</h3>
                <p className="text-gray-600">
                  What started as just an idea is now an early-stage startup with promising opportunities in the AI chatbot and customer support space.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border-2 border-purple-200 hover:border-purple-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">02</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Our Mission</h3>
                <p className="text-gray-600">
                  We set out to create a unified platform that brings together everything teams need—from customer support to seamless data management.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border-2 border-pink-200 hover:border-pink-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent mb-3">03</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">The Journey Ahead</h3>
                <p className="text-gray-600">
                  Our journey is just beginning. With each new feature, we're getting closer to our vision of making technology accessible to everyone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Our Values</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              The principles that guide everything we do and shape our culture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="group p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 animate-fade-up transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="container px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Join Us</h2>
            <p className="text-xl text-white/90 leading-relaxed mb-8">
              If you're interested in what we're creating, stay tuned. We're just getting started, and the best is yet to come.
            </p>
            <Link href="mailto:monotron.contact@gmail.com">
            <div className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-purple-600 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <Sparkles className="w-6 h-6" />
              More coming soon
            </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default About;