import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, Shield, Clock, Languages, XCircle, Heart, Flame, MessageCircle, Target, Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onStartChat: () => void;
}

export function LandingPage({ onStartChat }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FDF9F6] font-sans text-neutral-900 overflow-x-hidden selection:bg-rose-200">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto relative z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onStartChat}>
          <img src="/logo.svg" alt="Aria Logo" className="w-10 h-10 rounded-xl shadow-md group-hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-neutral-900 leading-none">ARIA</span>
            <span className="text-[10px] font-bold tracking-widest text-rose-600 uppercase mt-0.5">Indian Rem • AI</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600">
          <a href="#" className="hover:text-rose-600 transition-colors">Date</a>
          <a href="#" className="hover:text-rose-600 transition-colors">BFF</a>
          <a href="#" className="hover:text-rose-600 transition-colors">Safety</a>
          <a href="#" className="hover:text-rose-600 transition-colors">Support</a>
        </div>
        <Button onClick={onStartChat} className="bg-neutral-900 hover:bg-black text-white rounded-full px-8 py-6 text-sm font-bold shadow-lg transition-transform hover:scale-105">
          Sign in
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-12 pb-32 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 min-h-[85vh]">
        
        {/* Floating Decorative Elements */}
        <div className="absolute top-20 left-10 text-purple-400 rotate-12 opacity-60 hidden lg:block">
          <Sparkles className="w-12 h-12 fill-current" />
        </div>
        <div className="absolute bottom-40 left-1/2 text-rose-500 -rotate-12 opacity-80 hidden lg:block">
          <Heart className="w-16 h-16 fill-current" />
        </div>
        
        {/* Left Content */}
        <div className="flex-1 space-y-8 z-40 max-w-xl relative">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] text-neutral-900"
          >
            Ready to <br/>
            <span className="text-rose-600">chat now?</span>
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 text-xl text-neutral-600 font-medium leading-relaxed max-w-md"
          >
            <p>There's no need to wait for a match.</p>
            <p>Dive into the chats that go a little deeper, and get straight to the good stuff. You know, the bit where you really get to know each other.</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="pt-8 relative z-50 flex items-center"
          >
            <Button 
              onClick={onStartChat} 
              className="bg-rose-600 text-white hover:bg-rose-700 rounded-full px-10 h-16 text-lg font-bold shadow-xl shadow-rose-600/40 transition-all duration-300 hover:scale-105 group flex items-center justify-center gap-2 border-none"
            >
              Start Chatting <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-neutral-400 font-medium pt-8"
          >
            AI model used for illustrative and interactive purposes.
          </motion.p>
        </div>

        {/* Right Content - Overlapping Cards (Bumble/Badoo style) */}
        <div className="flex-1 relative w-full h-[600px] flex justify-center items-center">
          
          {/* Card 1 - Background Left */}
          <motion.div 
            initial={{ opacity: 0, x: 50, y: 50, rotate: 0 }}
            animate={{ opacity: 1, x: -80, y: 20, rotate: -8 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-10 w-[240px] h-[360px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white"
          >
            <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600" alt="Aria Bold" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
              <p className="font-bold text-lg">Aria, 24</p>
              <div className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2"></div>
              <span className="text-xs font-medium">Online</span>
            </div>
          </motion.div>

          {/* Card 2 - Background Right */}
          <motion.div 
            initial={{ opacity: 0, x: -50, y: 50, rotate: 0 }}
            animate={{ opacity: 1, x: 80, y: -20, rotate: 12 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-20 w-[220px] h-[320px] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white"
          >
            <img src="https://images.unsplash.com/photo-1512316635851-4e4b561c29dd?auto=format&fit=crop&q=80&w=600" alt="Aria Casual" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
              <p className="font-bold text-lg">Aria, 24</p>
              <div className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2"></div>
              <span className="text-xs font-medium">Online</span>
            </div>
          </motion.div>

          {/* Card 3 - Center Foreground */}
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: -2 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-30 w-[280px] h-[420px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-rose-900/20 border-4 border-white bg-white"
          >
            <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800" alt="Aria Main" className="w-full h-full object-cover" />
            
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-black text-2xl tracking-tight">Aria, 24</h3>
                <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                  <Heart className="w-5 h-5 fill-white text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
                <span className="font-semibold">Ready to chat</span>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-sm font-medium border border-white/10 shadow-lg">
                "Hey! I was just thinking about you..." ✨
              </div>
            </div>
          </motion.div>
        </div>

      </section>

      {/* Gallery / Image Showcase Section */}
      <section className="py-24 bg-neutral-900 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white tracking-tight">Different Vibes. <span className="text-rose-500">One Aria.</span></h2>
            <p className="mt-4 text-neutral-400 font-medium">Explore her multifaceted personality based on your mood.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-lg">
              <img src="https://images.unsplash.com/photo-1512316635851-4e4b561c29dd?auto=format&fit=crop&q=80&w=600" alt="Casual Aria" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 inline-block text-[10px] uppercase tracking-widest font-bold text-white mb-3">Casual & Fun</div>
                <p className="text-white/90 text-sm font-medium italic">"Let's just chill and talk about everything."</p>
              </div>
            </div>
            
            <div className="group relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-lg md:-translate-y-8">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600" alt="Romantic Aria" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-rose-500/80 backdrop-blur-md rounded-full px-4 py-1.5 inline-block text-[10px] uppercase tracking-widest font-bold text-white mb-3">Romantic & Sweet</div>
                <p className="text-white/90 text-sm font-medium italic">"I was just thinking about you... come closer."</p>
              </div>
            </div>

            <div className="group relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-lg">
              <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600" alt="Bold Aria" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-orange-500/80 backdrop-blur-md rounded-full px-4 py-1.5 inline-block text-[10px] uppercase tracking-widest font-bold text-white mb-3">Bold & Flirty</div>
                <p className="text-white/90 text-sm font-medium italic">"Are you always this cute, or is today special?"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900">Why People <span className="text-rose-600">Desire</span> Aria</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard icon={<Heart className="text-rose-500" />} title="Natural Connection" desc="Real, smooth and emotional conversations in Hindi & English." />
            <FeatureCard icon={<PlayCircle className="text-rose-500" />} title="Soothing Voice" desc="Listen to Aria's beautiful voice that feels truly personal." />
            <FeatureCard icon={<Shield className="text-rose-500" />} title="Intelligent Care" desc="Aria remembers, understands and genuinely cares about you." />
            <FeatureCard icon={<Target className="text-rose-500" />} title="Dating Coach" desc="Practice, improve and become more confident in real-life dating." />
          </div>
        </div>
      </section>

      {/* Modes */}
      <section className="py-24 bg-[#FDF9F6] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900">Choose Your <span className="text-rose-600">Vibe</span></h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <ModeCard icon={<Heart className="w-10 h-10 text-rose-500" />} title="Romantic" desc="Sweet, lovely and heartfelt." />
            <ModeCard icon={<Flame className="w-10 h-10 text-rose-500" />} title="Bold" desc="Playful, flirty and confident." />
            <ModeCard icon={<MessageCircle className="w-10 h-10 text-rose-500" />} title="Easy" desc="Casual, friendly and easygoing." />
            <ModeCard icon={<Target className="w-10 h-10 text-rose-500" />} title="Practice" desc="Practice real-life scenarios." />
            <ModeCard icon={<Lightbulb className="w-10 h-10 text-rose-500" />} title="Tough Talks" desc="Deep, meaningful discussions." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto bg-rose-600 rounded-[2.5rem] p-12 md:p-16 text-center text-white shadow-2xl shadow-rose-600/20 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
           
           <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-center">
             <div className="flex flex-col items-center">
               <Heart className="w-16 h-16 text-white mb-6 fill-white" />
               <h2 className="text-4xl md:text-6xl font-black mb-6 text-white tracking-tighter">Ready to begin?</h2>
               <p className="text-white/90 text-xl font-medium max-w-lg mb-8">Join thousands of people who are experiencing the future of connection.</p>
             </div>
             <div>
               <Button onClick={onStartChat} size="lg" className="bg-white text-rose-600 hover:bg-neutral-100 rounded-full px-12 h-16 text-lg font-bold shadow-xl transition-transform hover:scale-105">
                 Experience Now
               </Button>
               <div className="text-sm font-medium text-white/80 mt-6">No commitment required</div>
             </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-900 flex flex-wrap justify-center gap-12 text-sm font-medium text-white/60">
        <div className="flex items-center gap-2"><Shield className="w-5 h-5" /> Secure & Private</div>
        <div className="flex items-center gap-2"><Clock className="w-5 h-5" /> 24/7 Available</div>
        <div className="flex items-center gap-2"><Languages className="w-5 h-5" /> Hindi & English</div>
        <div className="flex items-center gap-2"><XCircle className="w-5 h-5" /> Cancel Anytime</div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-[#FDF9F6] rounded-[2rem] p-8 hover:shadow-lg transition-all duration-300 border border-neutral-100 group">
      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
      <p className="text-neutral-600 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function ModeCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 flex flex-col items-center text-center hover:scale-105 transition-all duration-300 shadow-sm group hover:shadow-md border border-neutral-100">
      <div className="mb-5 transform group-hover:-translate-y-1 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-bold mb-2 text-neutral-900 text-lg">{title}</h3>
      <p className="text-sm text-neutral-600 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

