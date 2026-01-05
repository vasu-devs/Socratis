import Link from 'next/link';
import { Phone, Code2, LineChart, ArrowRight, Star } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-glow-blue blur-[120px] rounded-full opacity-60" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[100px] rounded-full" />

      {/* Navigation - Minimalist */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0066FF] rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Socratis</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
          <Link href="#" className="hover:text-slate-900 transition-colors">How it works</Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">Problems</Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">Pricing</Link>
        </div>
        <Link
          href="/interview/new"
          className="bg-slate-950 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all active:scale-95"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 pt-20 pb-32 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-8">
          <Star className="w-3 h-3 text-[#0066FF] fill-[#0066FF]" />
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#0066FF]">The Future of Interview Prep</span>
        </div>

        <h1 className="text-6xl md:text-[84px] font-bold leading-[1.1] tracking-tight text-slate-950 mb-8">
          AI that gets you hired at <br />
          <span className="font-serif-italic font-normal text-slate-800">Elite Tech Roles.</span>
        </h1>

        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Socratis connects elite software engineers directly to their dream companies through realistic voice-based mock interviews. No gatekeepers, just skills.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/interview/new"
            className="group px-8 py-4 bg-[#0066FF] text-white rounded-full font-bold text-lg transition-all hover:bg-blue-600 active:scale-95 shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            Join Socratis Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="text-slate-900 font-semibold flex items-center gap-2 px-6 py-4 hover:translate-x-1 transition-transform">
            Watch Demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Social Proof Placeholder */}
        <div className="mt-24 pt-12 border-t border-slate-100">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Trusted by candidates from</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale">
            <span className="text-xl font-bold italic tracking-tighter">Google</span>
            <span className="text-xl font-bold italic tracking-tighter">Meta</span>
            <span className="text-xl font-bold italic tracking-tighter">Stripe</span>
            <span className="text-xl font-bold italic tracking-tighter">Airbnb</span>
            <span className="text-xl font-bold italic tracking-tighter">Amazon</span>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <section className="relative z-10 bg-slate-50/50 py-32 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <Feature
            icon={<Phone className="w-6 h-6 text-[#0066FF]" />}
            title="AI Voice Recruiter"
            desc="A human-like interviewer that probes your logic and clarifies edge cases."
          />
          <Feature
            icon={<Code2 className="w-6 h-6 text-[#0066FF]" />}
            title="Real-time Coding"
            desc="Integrated Monaco editor provides a pro-level coding environment."
          />
          <Feature
            icon={<LineChart className="w-6 h-6 text-[#0066FF]" />}
            title="Elite Feedback"
            desc="Detailed performance reports with action items to reach the top 1%."
          />
        </div>
      </section>

      <footer className="py-12 border-t border-slate-100 text-center text-slate-400 text-sm">
        <p>© 2026 Socratis Labs. Designed for elite engineers.</p>
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-950 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm max-w-xs">{desc}</p>
    </div>
  );
}
