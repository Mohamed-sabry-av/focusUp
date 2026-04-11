import Link from 'next/link';
import { 
  Play, 
  Calendar, 
  LogIn, 
  MessageSquare, 
  Bell, 
  Edit3, 
  GraduationCap, 
  ScrollText, 
  Rocket, 
  BookOpen, 
  Laptop, 
  Flower2, 
  ClipboardList, 
  Share2, 
  Globe 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] font-sans antialiased overflow-x-hidden selection:bg-[#0245a3] selection:text-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#fcf9f8]/90 backdrop-blur-md border-b border-transparent transition-all duration-300">
        <div className="flex justify-between items-center w-full px-8 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#003076] flex items-center justify-center font-extrabold text-white text-lg">F</div>
            <div className="text-2xl font-extrabold tracking-tight text-[#003076]">FocusUP</div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-tight">
            <a className="text-slate-600 hover:text-[#003076] transition-colors" href="#how-it-works">How it Works</a>
            <a className="text-slate-600 hover:text-[#003076] transition-colors" href="#why-it-works">Why it Works</a>
            <a className="text-slate-600 hover:text-[#003076] transition-colors" href="#use-cases">Use Cases</a>
            <a className="text-slate-600 hover:text-[#003076] transition-colors" href="#pricing">Pricing</a>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block px-5 py-2.5 text-sm font-bold text-[#003076] hover:bg-slate-100 rounded-xl transition-all active:scale-95">
              Sign In
            </Link>
            <Link href="/register" className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-br from-[#003076] to-[#0245a3] rounded-xl shadow-lg shadow-[#003076]/20 hover:brightness-110 transition-all active:scale-95">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative px-8 py-20 md:py-32 max-w-screen-2xl mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <h1 className="text-5xl md:text-[5.5rem] font-extrabold tracking-tight text-[#003076] leading-[1.05] mb-8">
                Get focused, with a little help from a friend.
              </h1>
              <p className="text-xl text-slate-600 font-medium leading-relaxed mb-10 max-w-lg">
                Experience the power of shared focus. Connect with partners globally for virtual co-working sessions that eliminate procrastination.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="px-8 py-4 bg-gradient-to-br from-[#003076] to-[#0245a3] text-white font-bold rounded-xl text-lg shadow-xl shadow-[#003076]/20 hover:scale-[1.02] active:scale-95 transition-all text-center">
                  Start Your First Session
                </Link>
                <a href="#how-it-works" className="px-8 py-4 bg-[#e5ebff] text-[#003076] font-bold rounded-xl text-lg hover:bg-[#d6e0ff] transition-all text-center">
                  How it works
                </a>
              </div>
            </div>
            
            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 fill-mode-both">
              <div className="aspect-video bg-[#f6f3f2] rounded-3xl shadow-2xl overflow-hidden border-8 border-white/50 relative group cursor-pointer">
                <img 
                  alt="Digital Sanctuary Workspace" 
                  className="w-full h-full object-cover grayscale-[20%] transition-transform duration-700 group-hover:scale-105" 
                  src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=2000&auto=format&fit=crop"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-[#003076]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-20 h-20 bg-white shadow-xl rounded-full flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-8 h-8 text-[#003076] ml-1" />
                  </div>
                </div>
              </div>
              
              {/* Tonal Layering Decoration */}
              <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-[#b0c6ff] rounded-full blur-3xl opacity-20"></div>
              <div className="absolute -z-10 -top-10 -left-10 w-64 h-64 bg-[#0245a3] rounded-full blur-3xl opacity-10"></div>
            </div>
          </div>
        </section>

        {/* How it Works: Bento Grid Layout */}
        <section className="py-24 bg-[#f6f3f2]" id="how-it-works">
          <div className="max-w-screen-2xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="text-4xl font-extrabold tracking-tight text-[#003076] mb-4">How to use FocusUP?</h2>
              <div className="w-24 h-1.5 bg-[#0245a3] rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#e5ebff] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                  <Calendar className="w-7 h-7 text-[#003076]" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">Book a session</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Choose a time that works for you from our global calendar. Commitment starts here.</p>
              </div>
              
              {/* Step 2 */}
              <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#e5ebff] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                  <LogIn className="w-7 h-7 text-[#003076]" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">Join the session</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Log in when it's time. You'll be instantly matched with a partner who's ready to work.</p>
              </div>
              
              {/* Step 3 */}
              <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#e5ebff] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                   <MessageSquare className="w-7 h-7 text-[#003076]" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">Greet your partner</h3>
                <p className="text-slate-500 font-medium leading-relaxed">A quick hi, share your goal for the hour, and then we go on mute to start the flow.</p>
              </div>
              
              {/* Step 4 */}
              <div className="bg-white p-10 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 bg-[#fff0f0] rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                  <Bell className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-slate-800">The Bell</h3>
                <p className="text-slate-500 font-medium leading-relaxed">After 50 minutes, the bell rings. Share your progress and celebrate the win.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why it Works Section */}
        <section className="py-32" id="why-it-works">
          <div className="max-w-screen-2xl mx-auto px-8">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="lg:w-1/2 order-2 lg:order-1 relative">
                <img 
                  alt="People working in harmony" 
                  className="rounded-[2.5rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop"
                />
                
                <div className="absolute -bottom-10 -right-10 bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl max-w-sm hidden md:block border border-white">
                  <p className="text-[#003076] font-extrabold italic text-lg leading-snug">
                    "FocusUP has completely changed my output. Body doubling is like magic."
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <img src="https://i.pravatar.cc/150?img=5" alt="Sarah Jenkins" className="w-12 h-12 rounded-full ring-2 ring-white shadow-md object-cover" />
                    <div>
                      <div className="text-base font-bold text-slate-900">Sarah Jenkins</div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Freelance Writer</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#003076] mb-10">Why it works</h2>
                <div className="space-y-12">
                  <div className="p-6 rounded-[2rem] hover:bg-white transition-colors duration-300 -mx-6">
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-4 text-slate-800">
                      <span className="w-10 h-1.5 bg-[#0245a3] rounded-full"></span>
                      The Power of Showing Up
                    </h3>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed pl-14">
                      Just the act of booking a session creates a social contract. You're not just working for yourself; you're showing up for your partner too.
                    </p>
                  </div>
                  
                  <div className="p-6 rounded-[2rem] hover:bg-white transition-colors duration-300 -mx-6">
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-4 text-slate-800">
                      <span className="w-10 h-1.5 bg-[#b0c6ff] rounded-full"></span>
                      Staying Focused
                    </h3>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed pl-14">
                      In the presence of another focused person, your brain finds it easier to ignore distractions. It's the 'Library Effect' brought to your home office.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases: Icons Grid */}
        <section className="py-24 bg-[#f0edec]" id="use-cases">
          <div className="max-w-screen-2xl mx-auto px-8">
            <div className="text-center max-w-3xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#003076] mb-6">What can you use it for?</h2>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Whether you're finishing a degree or launching a startup, FocusUP is your silent companion.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { icon: Edit3, title: 'Write', desc: 'Draft your novel or blog posts.' },
                { icon: GraduationCap, title: 'Study', desc: 'Prep for exams without distraction.' },
                { icon: ScrollText, title: 'PhD', desc: 'Research and thesis writing.' },
                { icon: Rocket, title: 'Side hustle', desc: 'Build your dream after hours.' },
                { icon: BookOpen, title: 'Read', desc: 'Deep reading and analysis.' },
                { icon: Laptop, title: 'Freelance', desc: 'Get through your client queue.' },
                { icon: Flower2, title: 'Meditate', desc: 'Silent guided presence.' },
                { icon: ClipboardList, title: 'Plan & reflect', desc: 'Weekly planning sessions.' },
              ].map((item, i) => (
                <div key={i} className="group bg-white p-8 rounded-[2rem] text-center hover:bg-[#0245a3] hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl">
                  <div className="w-16 h-16 bg-[#f6f3f2] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-white/20 transition-colors duration-300 flex-shrink-0">
                    <item.icon className="w-8 h-8 text-[#003076] group-hover:text-white transition-colors duration-300" strokeWidth={2} />
                  </div>
                  <h4 className="font-extrabold text-xl mb-2 text-slate-800 group-hover:text-white transition-colors duration-300">{item.title}</h4>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-[#b0c6ff] transition-colors duration-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32" id="pricing">
          <div className="max-w-5xl mx-auto px-8 text-center">
            <div className="bg-gradient-to-br from-[#003076] to-[#0245a3] p-16 md:p-24 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Ready to find your flow?</h2>
                <p className="text-[#b0c6ff] text-xl mb-12 font-medium max-w-2xl mx-auto">
                  Join thousands of professionals and students who use FocusUP daily to eliminate procrastination.
                </p>
                <Link href="/register" className="inline-block px-10 py-5 bg-white text-[#003076] font-extrabold rounded-2xl text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all">
                  Start Your Free 7-Day Trial
                </Link>
                <p className="text-white/60 mt-6 font-medium text-sm">No credit card required for trial.</p>
              </div>
              
              {/* Abstract Background Shapes */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl opacity-60"></div>
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#001945]/30 rounded-full blur-3xl opacity-60"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-[#f6f3f2]">
        <div className="flex flex-col md:flex-row justify-between items-center px-10 py-12 w-full max-w-screen-2xl mx-auto gap-8">
          <div className="text-center md:text-left">
            <div className="text-2xl font-extrabold text-[#003076] mb-2 tracking-tight">FocusUP</div>
            <p className="font-sans font-medium text-xs text-slate-500">© 2024 FocusUP Digital Sanctuary.<br className="md:hidden"/> All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 font-semibold text-xs text-slate-500">
            <a className="hover:text-[#003076] transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-[#003076] transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-[#003076] transition-colors" href="#">Contact Us</a>
            <a className="hover:text-[#003076] transition-colors" href="#">Cookie Settings</a>
          </div>
          
          <div className="flex gap-4">
            <a className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-[#e5ebff] hover:text-[#003076] transition-colors shadow-sm text-slate-400" href="#">
              <Share2 className="w-5 h-5" />
            </a>
            <a className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-[#e5ebff] hover:text-[#003076] transition-colors shadow-sm text-slate-400" href="#">
              <Globe className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
