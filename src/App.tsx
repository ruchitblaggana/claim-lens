import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Link2,
  ShieldCheck,
  Download,
  Keyboard,
  Chrome,
  Mic,
  Tag,
  Archive,
  ArrowRight,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Quote,
  ChevronRight,
  Layers,
  PenLine,
  Eye,
  Database,
  Lock,
  Github,
  Mail,
} from 'lucide-react';

function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navRefs = {
    features: useRef<HTMLElement>(null),
    workflow: useRef<HTMLElement>(null),
    evidence: useRef<HTMLElement>(null),
    privacy: useRef<HTMLElement>(null),
    developer: useRef<HTMLElement>(null),
    install: useRef<HTMLElement>(null),
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    Object.values(navRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'developer', label: 'Developer' },
    { id: 'install', label: 'Install' },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ink/95 backdrop-blur-sm border-b border-ink/20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-lime relative flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-ink" />
            </div>
            <div>
              <div className="text-paper font-semibold text-base leading-none">ClaimLens</div>
              <div className="text-lime text-[10px] font-mono leading-none mt-0.5">Read beyond the claim</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  activeSection === item.id
                    ? 'text-lime'
                    : 'text-paper/70 hover:text-paper'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#install"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-lime text-ink rounded-md text-sm font-semibold hover:bg-lime-dark transition-colors"
            >
              <Download className="w-4 h-4" />
              Install
            </a>
            <button
              className="md:hidden text-paper p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <XCircle className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden bg-ink border-t border-paper/10 px-6 py-3 flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm text-paper/70 hover:text-lime rounded-md"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="hero" className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, #202522 31px, #202522 32px)`,
        }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-lime/20 text-olive rounded-full text-xs font-mono mb-6">
                <ShieldCheck className="w-3.5 h-3.5" />
                Local-first · No backend · No AI
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
                Read beyond{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">the claim.</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-lime -z-0" />
                </span>
              </h1>
              <p className="text-lg text-slate-cl leading-relaxed mb-8 max-w-lg" style={{ color: '#6d7470' }}>
                ClaimLens is a browser extension that helps you capture claims from any webpage,
                organize supporting and contradicting evidence, and build traceable investigations —
                all stored privately on your device.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#install"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper rounded-lg font-semibold hover:bg-ink/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Get ClaimLens
                </a>
                <a
                  href="#workflow"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-ink/20 rounded-lg font-semibold hover:bg-paper-2 transition-colors"
                  style={{ borderColor: '#dcddd3' }}
                >
                  See how it works
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="flex gap-6 mt-8 text-xs text-slate-cl font-mono" style={{ color: '#6d7470' }}>
                <span>Chrome</span>
                <span>·</span>
                <span>Edge</span>
                <span>·</span>
                <span>Manifest V3</span>
              </div>
            </div>

            {/* Hero visual — simulated claim with evidence */}
            <div className="relative">
              <div className="bg-white rounded-xl shadow-lg border border-border-cl p-6" style={{ borderColor: '#dcddd3' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-olive" />
                  <span className="text-xs font-mono" style={{ color: '#6d7470' }}>theatlantic.com</span>
                  <span className="text-xs font-mono" style={{ color: '#6d7470' }}>· 3 days ago</span>
                </div>
                <p className="font-serif text-lg leading-relaxed mb-5">
                  <span className="bg-lime/50 px-0.5">
                    Moderate coffee consumption is associated with a 12% reduction in all-cause mortality.
                  </span>
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-paper-2" style={{ background: '#efeddf' }}>
                    Investigating
                  </span>
                  <span className="text-xs font-mono" style={{ color: '#6d7470' }}>3 evidence sources</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-md" style={{ background: '#e7efeb', borderLeft: '3px solid #477d69' }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#477d69' }} />
                    <div>
                      <div className="text-sm font-semibold">Lancet meta-analysis, 2023</div>
                      <div className="text-xs font-mono" style={{ color: '#6d7470' }}>Supports · Primary source</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-md" style={{ background: '#f0e4e1', borderLeft: '3px solid #a95749' }}>
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#a95749' }} />
                    <div>
                      <div className="text-sm font-semibold">FDA caffeine review, 2022</div>
                      <div className="text-xs font-mono" style={{ color: '#6d7470' }}>Contradicts · Methodology concerns</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-md" style={{ background: '#e6ebf0', borderLeft: '3px solid #5a7188' }}>
                    <CircleDashed className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#5a7188' }} />
                    <div>
                      <div className="text-sm font-semibold">WHO dietary guidelines</div>
                      <div className="text-xs font-mono" style={{ color: '#6d7470' }}>Context · Secondary source</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating annotation */}
              <div className="absolute -bottom-5 -left-5 bg-ink text-paper rounded-lg px-4 py-3 shadow-xl hidden sm:block">
                <div className="text-xs font-mono text-lime mb-1">Source quality</div>
                <div className="text-sm">3 criteria assessed · 2 unresolved</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-ink text-paper py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '100%', label: 'Local storage', icon: Database },
            { value: '0', label: 'External servers', icon: Lock },
            { value: '7', label: 'Claim statuses', icon: Tag },
            { value: '5', label: 'Evidence types', icon: FileText },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <stat.icon className="w-5 h-5 text-lime mb-3" />
              <div className="text-3xl font-bold text-paper">{stat.value}</div>
              <div className="text-xs text-paper/50 font-mono mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={navRefs.features} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-mono text-olive uppercase tracking-widest mb-3">Features</div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              An evidence scrapbook for the critical reader.
            </h2>
            <p className="text-lg" style={{ color: '#6d7470' }}>
              Not a truth detector. Not a fact-checker. A structured workspace for capturing,
              organizing, and reasoning about the claims you encounter online.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: 'Capture from any page',
                desc: 'Select text, click the toolbar icon, or right-click and choose "Save selection to ClaimLens." Source URL, page title, timestamp, and surrounding context are captured automatically.',
              },
              {
                icon: Layers,
                title: 'Evidence that persists',
                desc: 'Attach sources as supporting, contradicting, contextual, or unclear. Each piece of evidence keeps its relationship, excerpt, source quality assessment, and your notes — across browser restarts.',
              },
              {
                icon: FileText,
                title: 'Source quality assessments',
                desc: 'Eight transparent criteria: primary vs secondary, author identified, publication date, references, expertise, conflicts of interest, methodology, and corroboration. No opaque credibility score.',
              },
              {
                icon: BookOpen,
                title: 'Investigations',
                desc: 'Group related claims into a research investigation. Link evidence, record open questions, and author a conclusion that traces back to the sources you recorded.',
              },
              {
                icon: Eye,
                title: 'Reading companion',
                desc: 'Revisit a page and see which claims you have already saved from it. Add page notes and jump straight to the investigation workspace.',
              },
              {
                icon: Download,
                title: 'Export & import',
                desc: 'Download your entire library as JSON. Export single claims or full investigations. Import backups safely — existing records are never silently overwritten.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border transition-all hover:shadow-md"
                style={{ borderColor: '#dcddd3' }}
              >
                <div className="w-10 h-10 rounded-lg bg-paper-2 flex items-center justify-center mb-4" style={{ background: '#efeddf' }}>
                  <feature.icon className="w-5 h-5 text-ink" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6d7470' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" ref={navRefs.workflow} className="py-24 px-6 bg-paper-2" style={{ background: '#efeddf' }}>
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-mono text-olive uppercase tracking-widest mb-3">Workflow</div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              From passive reading to structured investigation.
            </h2>
            <p className="text-lg" style={{ color: '#6d7470' }}>
              Five steps that turn a sentence you stumbled upon into a traceable, evidence-backed assessment.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              { num: '01', icon: Quote, title: 'Select a claim', desc: 'Highlight a statement on any webpage.' },
              { num: '02', icon: Search, title: 'Capture context', desc: 'Source URL, title, timestamp, and surrounding text are saved.' },
              { num: '03', icon: FileText, title: 'Collect evidence', desc: 'Add supporting, contradicting, and contextual sources.' },
              { num: '04', icon: Layers, title: 'Compare perspectives', desc: 'See evidence grouped by relationship to the claim.' },
              { num: '05', icon: PenLine, title: 'Record a conclusion', desc: 'Your assessment, traceable to the evidence behind it.' },
            ].map((step, i) => (
              <div key={step.num} className="relative">
                {i < 4 && (
                  <div className="hidden md:block absolute top-8 left-[60%] right-[-20%] h-px bg-border-cl" style={{ background: '#dcddd3' }} />
                )}
                <div className="bg-white rounded-xl p-5 border relative z-10" style={{ borderColor: '#dcddd3' }}>
                  <div className="text-xs font-mono text-olive mb-3">{step.num}</div>
                  <step.icon className="w-6 h-6 text-ink mb-3" />
                  <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#6d7470' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Evidence system */}
      <section id="evidence" ref={navRefs.evidence} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-mono text-olive uppercase tracking-widest mb-3">Evidence</div>
              <h2 className="text-4xl font-bold leading-tight mb-6">
                Supporting and contradicting evidence stay distinguishable.
              </h2>
              <p className="text-lg mb-6" style={{ color: '#6d7470' }}>
                Every source you attach has a clear relationship label. Three low-quality sources
                repeating the same claim do not automatically outweigh one primary source.
                ClaimLens never calculates a truth percentage — you decide what the evidence supports.
              </p>
              <div className="space-y-4">
                {[
                  { icon: CheckCircle2, color: '#477d69', bg: '#e7efeb', label: 'Supports the claim', desc: 'Evidence that reinforces the claim.' },
                  { icon: XCircle, color: '#a95749', bg: '#f0e4e1', label: 'Contradicts the claim', desc: 'Evidence that challenges the claim.' },
                  { icon: CircleDashed, color: '#5a7188', bg: '#e6ebf0', label: 'Provides context', desc: 'Background without taking a side.' },
                  { icon: Mic, color: '#777f57', bg: '#efeddf', label: 'Challenges methodology', desc: 'Questions how the claim was derived.' },
                ].map((rel) => (
                  <div key={rel.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: rel.bg }}>
                      <rel.icon className="w-4 h-4" style={{ color: rel.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{rel.label}</div>
                      <div className="text-xs" style={{ color: '#6d7470' }}>{rel.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source assessment visual */}
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#dcddd3' }}>
              <h3 className="text-sm font-semibold mb-1">Source quality assessment</h3>
              <p className="text-xs mb-5" style={{ color: '#6d7470' }}>
                User-editable criteria. Not an objective measure of truth.
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Primary vs secondary source', value: 'Primary', color: '#477d69' },
                  { label: 'Author or organization identified', value: 'Yes', color: '#477d69' },
                  { label: 'Publication date visible', value: 'Yes', color: '#477d69' },
                  { label: 'References provided', value: 'Yes', color: '#477d69' },
                  { label: 'Relevant expertise documented', value: 'Unknown', color: '#5a7188' },
                  { label: 'Potential conflicts of interest', value: 'No', color: '#477d69' },
                  { label: 'Methodology available', value: 'Unknown', color: '#5a7188' },
                  { label: 'Independently corroborated', value: 'Not applicable', color: '#6d7470' },
                ].map((c) => (
                  <div key={c.label} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#dcddd3' }}>
                    <span className="text-xs" style={{ color: '#3a3f3b' }}>{c.label}</span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${c.color}15`, color: c.color }}
                    >
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 rounded-md text-xs italic" style={{ background: '#efeddf', color: '#6d7470' }}>
                Assessment note: "Meta-analysis of 23 studies. Authors disclose no industry funding.
                Methodology section unavailable in abstract."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" ref={navRefs.privacy} className="py-24 px-6 bg-ink text-paper">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-lime/10 text-lime rounded-full text-xs font-mono mb-6">
              <Lock className="w-3.5 h-3.5" />
              Private by default
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Your research never leaves your browser.
            </h2>
            <p className="text-lg text-paper/60 max-w-2xl mx-auto">
              No analytics. No telemetry. No remote database. No AI service. No account.
              ClaimLens works entirely on your device.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'No analytics transmission',
              'No telemetry sent to third parties',
              'No remote database',
              'No account requirement',
              'No external AI service',
              'No automatic upload of captured text',
              'No background scraping of webpages',
              'No unnecessary browsing history collection',
              'No automatic reading of form inputs or passwords',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 p-4 rounded-lg bg-paper/5 border border-paper/10">
                <CheckCircle2 className="w-4 h-4 text-lime flex-shrink-0 mt-0.5" />
                <span className="text-sm text-paper/80">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-block px-6 py-4 rounded-lg border border-paper/10 bg-paper/5">
              <Database className="w-6 h-6 text-lime mx-auto mb-2" />
              <div className="text-sm text-paper/70">
                All data stored in <span className="font-mono text-lime">IndexedDB</span> on your device.
                Use export/import to transfer between browsers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer / About */}
      <section id="developer" ref={navRefs.developer} className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-mono text-olive uppercase tracking-widest mb-3">Developer</div>
          <h2 className="text-4xl font-bold leading-tight mb-12">
            Built by Ruchit Blaggana.
          </h2>

          <div className="bg-ink text-paper rounded-2xl p-8 md:p-12 mb-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="w-16 h-16 rounded-full bg-lime mb-4 flex items-center justify-center">
                  <span className="text-ink font-bold text-xl">RB</span>
                </div>
                <h3 className="text-xl font-semibold mb-1">Ruchit Blaggana</h3>
                <p className="text-sm text-paper/60 mb-3">Computer Science student</p>
                <p className="text-sm text-paper/70 leading-relaxed">
                  Delhi Public School, Vasant Kunj, New Delhi. Grade 12, planning to study
                  Computer Science in the USA, Canada, or Australia.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-mono text-lime mb-4 uppercase tracking-wider">Academic record</h4>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between border-b border-paper/10 pb-2"><span class="text-paper/60">Grade 9</span><span>93.2%</span></div>
                  <div className="flex justify-between border-b border-paper/10 pb-2"><span class="text-paper/60">Grade 10</span><span>94.4%</span></div>
                  <div className="flex justify-between border-b border-paper/10 pb-2"><span class="text-paper/60">Grade 11</span><span>80.4%</span></div>
                  <div className="flex justify-between"><span class="text-paper/60">Grade 12</span><span class="text-lime">Pursuing</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-mono text-lime mb-4 uppercase tracking-wider">Featured project</h4>
                <p className="text-sm text-paper/70 leading-relaxed mb-3">
                  <strong className="text-paper">Smart Hat for the Visually Impaired</strong>
                </p>
                <p className="text-sm text-paper/60 leading-relaxed">
                  Arduino Uno + ultrasonic sensors to detect overhead obstacles. Built during an
                  AI/ML/Robotics summer program at IIT Delhi through Rancho Labs.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#dcddd3' }}>
              <h4 className="text-sm font-semibold mb-4">Research & Innovation</h4>
              <ul className="space-y-3 text-sm" style={{ color: '#6d7470' }}>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Co-developed an instrument with a patent application filed and pending review.</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Data compilation and research assistance for a dentistry article under publication.</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#dcddd3' }}>
              <h4 className="text-sm font-semibold mb-4">Academic Achievements</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#6d7470' }}>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Scholar Badge of Excellence — consistently throughout school</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Gold Medal for Academic Excellence, Grade 11</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Regional Rank 3, Vigyan Vidyarthi Manthan</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Bronze medal, Inter-School Swimming 2024</li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Rolling Trophy, Inter-School Luminaire Competition</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 mt-6" style={{ borderColor: '#dcddd3' }}>
            <h4 className="text-sm font-semibold mb-4">Leadership & Community Impact</h4>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm" style={{ color: '#6d7470' }}>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Secretary of the Interact Club</div>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Financial literacy workshops for government-school students</div>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Fundraising for orphanages and elderly care</div>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Paper recycling and textile sustainability initiatives</div>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Volunteering at Earth Saviours Foundation</div>
              <div className="flex gap-2"><ChevronRight className="w-4 h-4 text-olive flex-shrink-0 mt-0.5" />Letter of Recommendation from the Interact Club</div>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-xl bg-paper-2 border" style={{ background: '#efeddf', borderColor: '#dcddd3' }}>
            <h4 className="text-base font-semibold mb-3">Why ClaimLens was built</h4>
            <p className="text-sm leading-relaxed font-serif" style={{ color: '#3a3f3b' }}>
              The internet presents millions of claims, statistics, and arguments every day. The challenge
              is not finding information — it is determining what the available evidence actually supports.
              ClaimLens was built to help readers move from passive consumption to structured investigation:
              capturing claims with their source context, organizing supporting and contradicting evidence,
              and building traceable, user-authored conclusions. It is an evidence organization and
              critical-reading tool, not an automated truth detector. The user always makes the final assessment.
            </p>
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" ref={navRefs.install} className="py-24 px-6 bg-paper-2" style={{ background: '#efeddf' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-mono text-olive uppercase tracking-widest mb-3">Install</div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Load ClaimLens in your browser.
            </h2>
            <p className="text-lg" style={{ color: '#6d7470' }}>
              Developer mode installation for Chrome and Edge. No store publish required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#dcddd3' }}>
              <div className="flex items-center gap-3 mb-6">
                <Chrome className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Google Chrome</h3>
              </div>
              <ol className="space-y-3 text-sm" style={{ color: '#6d7470' }}>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">1.</span>Open <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-paper-2" style={{ background: '#efeddf' }}>chrome://extensions</code></li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">2.</span>Enable <strong className="text-ink">Developer mode</strong> (top-right toggle)</li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">3.</span>Click <strong className="text-ink">Load unpacked</strong></li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">4.</span>Select the <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-paper-2" style={{ background: '#efeddf' }}>extension/</code> directory</li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">5.</span>Pin the extension and test on a webpage</li>
              </ol>
            </div>

            <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#dcddd3' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-sm bg-ink" />
                </div>
                <h3 className="text-lg font-semibold">Microsoft Edge</h3>
              </div>
              <ol className="space-y-3 text-sm" style={{ color: '#6d7470' }}>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">1.</span>Open <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-paper-2" style={{ background: '#efeddf' }}>edge://extensions</code></li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">2.</span>Enable <strong className="text-ink">Developer mode</strong> (left sidebar)</li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">3.</span>Click <strong className="text-ink">Load unpacked</strong></li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">4.</span>Select the <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-paper-2" style={{ background: '#efeddf' }}>extension/</code> directory</li>
                <li className="flex gap-3"><span className="font-mono text-ink font-bold">5.</span>Test the capture workflow on a webpage</li>
              </ol>
            </div>
          </div>

          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-5 flex items-start gap-3" style={{ borderColor: '#dcddd3' }}>
              <Keyboard className="w-5 h-5 text-olive flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Shortcuts</div>
                <div className="text-xs font-mono mt-1" style={{ color: '#6d7470' }}>
                  Alt+Shift+C — capture<br />
                  Alt+Shift+L — workspace
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-5 flex items-start gap-3" style={{ borderColor: '#dcddd3' }}>
              <ShieldCheck className="w-5 h-5 text-olive flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Permissions</div>
                <div className="text-xs font-mono mt-1" style={{ color: '#6d7470' }}>
                  storage, contextMenus,<br />activeTab, scripting
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-5 flex items-start gap-3" style={{ borderColor: '#dcddd3' }}>
              <Archive className="w-5 h-5 text-olive flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Build</div>
                <div className="text-xs font-mono mt-1" style={{ color: '#6d7470' }}>
                  node tools/build.js<br />
                  node --test test/
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-lg border text-sm text-center" style={{ borderColor: '#dcddd3', color: '#6d7470' }}>
            This is a locally installed developer extension, not a published store extension.
            It has not been submitted to the Chrome Web Store or Microsoft Edge Add-ons.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-paper py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-lime relative flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-ink" />
                </div>
                <div>
                  <div className="text-paper font-semibold text-sm">ClaimLens</div>
                  <div className="text-lime text-[10px] font-mono">Read beyond the claim</div>
                </div>
              </div>
              <p className="text-sm text-paper/50 max-w-sm leading-relaxed">
                A browser extension for evidence organization and critical reading.
                Local-first, private by design. Built by Ruchit Blaggana.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <a href="#features" className="text-paper/60 hover:text-lime transition-colors">Features</a>
              <a href="#workflow" className="text-paper/60 hover:text-lime transition-colors">Workflow</a>
              <a href="#privacy" className="text-paper/60 hover:text-lime transition-colors">Privacy</a>
              <a href="#install" className="text-paper/60 hover:text-lime transition-colors">Install</a>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-paper/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-paper/40 font-mono">
              Manifest V3 · Chrome & Edge · v1.0.0
            </div>
            <div className="flex items-center gap-4">
              <Link2 className="w-4 h-4 text-paper/30" />
              <Github className="w-4 h-4 text-paper/30" />
              <Mail className="w-4 h-4 text-paper/30" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
