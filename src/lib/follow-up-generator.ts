import { JobListing } from '@/types/job';

export interface FollowUpEmailParams {
  userName: string;
  jobTitle: string;
  company: string;
  contactName?: string;
  daysSinceApplied: number;
  followUpNumber: number; // 1st, 2nd, 3rd follow-up
  userSummary?: string; // brief professional summary
}

export type StoryVibeId =
  | 'user_empathy'
  | 'origin_spark'
  | 'high_stakes_scale'
  | 'bold_contrarian'
  | 'craft_resilience'
  | 'zero_to_one';

export interface ColdDMParams {
  userName: string;
  jobTitle: string;
  company: string;
  contactName?: string;
  platform: 'linkedin' | 'twitter' | 'email';
  userSummary?: string;
  domain?: string;
  keySkills?: string[];
  experienceYears?: number;
  vibeId?: StoryVibeId;
  customStory?: string;
}

export interface ThankYouParams {
  userName: string;
  interviewerName: string;
  jobTitle: string;
  company: string;
  keyDiscussionPoints?: string;
}

export interface StoryVibeOption {
  id: StoryVibeId;
  label: string;
  icon: string;
  desc: string;
}

export const STORY_VIBES: StoryVibeOption[] = [
  {
    id: 'origin_spark',
    label: 'Origin Spark',
    icon: '🌟',
    desc: 'Formative spark, early life turning point & curiosity',
  },
  {
    id: 'high_stakes_scale',
    label: 'High Stakes',
    icon: '⚡',
    desc: 'High-pressure scale, mission-critical uptime & resilience',
  },
  {
    id: 'bold_contrarian',
    label: 'Bold Contrarian',
    icon: '💡',
    desc: 'Challenging consensus, non-consensus bets & high conviction',
  },
  {
    id: 'user_empathy',
    label: 'User Empathy',
    icon: '🎯',
    desc: 'Human friction, dignity & solving real user pain',
  },
  {
    id: 'craft_resilience',
    label: 'Craft & Resilience',
    icon: '🛠️',
    desc: 'Systems mastery, clean architecture & rigorous discipline',
  },
  {
    id: 'zero_to_one',
    label: '0-to-1 Breakthrough',
    icon: '🚀',
    desc: 'Shipping fast from scratch, velocity & tangible impact',
  },
];

export interface DomainStoryArc {
  origin: string;
  journey: (skills: string, exp: number) => string;
  philosophy: string;
  click: (company: string, title: string) => string;
  vibeId: StoryVibeId;
}

/**
 * Returns a domain-specific narrative arc customized for a specific vibe or randomly selected.
 */
export function getDomainStoryArc(
  jobTitle: string,
  company: string,
  domainOrVibe?: string | StoryVibeId,
  vibeId?: StoryVibeId
): DomainStoryArc {
  const validVibes = new Set<string>([
    'user_empathy',
    'origin_spark',
    'high_stakes_scale',
    'bold_contrarian',
    'craft_resilience',
    'zero_to_one',
  ]);

  let domain = domainOrVibe;
  let resolvedVibe = vibeId;

  if (!resolvedVibe && domainOrVibe && validVibes.has(domainOrVibe)) {
    resolvedVibe = domainOrVibe as StoryVibeId;
    domain = undefined;
  }

  const combined = `${jobTitle} ${company} ${domain || ''}`.toLowerCase();
  vibeId = resolvedVibe;

  // 1. DESIGN / UI / UX / FRONTEND
  if (/design|ui|ux|product\s*design|brand|creative|visual|interface|frontend|front-end/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'I once sat beside a user who spent 45 agonizing minutes struggling through a confusing, hostile checkout flow before giving up entirely. Watching that frustration firsthand made me realize that good design is never just superficial styling—it is accessibility, empathy, and respect for human time and dignity.',
        journey: (skills, exp) =>
          `That realization shaped my craft. Over the past ${exp}+ years, I have honed my expertise in ${skills}, crafting intuitive digital experiences and scalable design systems. I pride myself on stripping away friction, listening deeply to user pain points, and bridging the gap between elegant aesthetics and seamless engineering execution.`,
        philosophy:
          "I've always believed that great product design doesn't just involve making things look beautiful, but making complex problems feel effortless and deeply human.",
        click: (c, t) =>
          `So when I saw the standard of craft you hold at ${c}, it felt like something clicked. The taste. The attention to detail. The relentless focus on user delight. That's exactly the kind of environment where I want to pour my creativity and experience as a ${t}.`,
      },
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          'Growing up, I was endlessly fascinated by how moving physical parts in mechanical watches worked together effortlessly. The first time I wrote code that animated a digital interface smoothly in direct response to user touch, that same wonder returned: software is the most responsive, expressive canvas humanity has ever built.',
        journey: (skills, exp) =>
          `It became my lifelong focus. Over the past ${exp}+ years, I have specialized in ${skills}, building refined, highly tactile user interfaces that respond gracefully under all device constraints.`,
        philosophy:
          "I've always believed that the best software interfaces feel like a natural extension of human thought—instant, intuitive, and remarkably polished.",
        click: (c, t) =>
          `When I explored what your team is building at ${c}, it felt like an instant click. The design culture. The micro-interactions. The commitment to world-class user experience. I would love to bring my energy and craft to ${c} as your next ${t}.`,
      },
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'During a high-traffic live product release early in my career, a subtle layout breakpoint bug on mobile Safari broke key CTA buttons for tens of thousands of visitors. Scrambling to diagnose the rendering issue in real time taught me that frontend development is uncompromising precision engineering where every millisecond and pixel directly impacts real outcomes.',
        journey: (skills, exp) =>
          `That discipline has governed my entire approach over the past ${exp}+ years. Mastering ${skills}, I build rock-solid, cross-browser responsive systems with automated visual regression tests and strict performance budgets.`,
        philosophy:
          "I've always believed that elite frontend execution demands both artistic refinement and paranoid systems-level rigor.",
        click: (c, t) =>
          `So when I looked into the scale and technical ambition of ${c}, it felt like something clicked. The high engineering bar. The speed of iteration. The chance to build interfaces that millions rely on daily. That is exactly where I want to focus my experience as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'A senior design engineer once challenged me to build an entire rich interaction pattern from scratch without bloated third-party libraries. Diving deep into the browser DOM, layout reflows, and hardware-accelerated transforms stripped away shortcuts and instilled an obsession with lean, high-performance craft.',
        journey: (skills, exp) =>
          `That foundation has set me apart over ${exp}+ years. Specializing in ${skills}, I architect maintainable design systems and component libraries that empower engineering teams to ship faster without sacrificing visual integrity.`,
        philosophy:
          "I've always believed that true craftsmanship is invisible: clean component architecture, airtight state management, and silky 60fps responsiveness.",
        click: (c, t) =>
          `Seeing ${c}'s engineering and design philosophy immediately clicked with how I work. The taste, the modularity, and the high bar of execution. I'd love to contribute directly to ${c}'s product journey as a ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I built and shipped a standalone productivity tool from scratch over a single weekend to solve an annoying workflow friction for my peers. Seeing people actively using it by Monday morning and telling me "this gave us an hour of our day back" hooked me forever on the exhilarating power of shipping fast, high-impact product experiences.',
        journey: (skills, exp) =>
          `That bias for velocity has propelled my work for ${exp}+ years. With deep mastery in ${skills}, I thrive in fast-paced environments where moving from concept to interactive prototype to production happens in tight, continuous loops.`,
        philosophy:
          "I've always believed in high agency, rapid prototyping, and delivering tangible value directly into user hands without unnecessary friction.",
        click: (c, t) =>
          `When I discovered ${c}'s pace of product delivery and bold roadmap, it felt like something clicked. The velocity. The autonomy. The chance to build and ship meaningful features rapidly as a ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'While the industry was obsessively chasing fleeting visual fads and bloated micro-animations that alienated real users, I took a contrarian stance: true innovation lies in ruthless clarity, lightning accessibility, and radical simplicity that respects human attention.',
        journey: (skills, exp) =>
          `Standing by that conviction over ${exp}+ years, I have leveraged ${skills} to build durable design systems that resist fashion cycles and deliver measurable conversion and usability lifts.`,
        philosophy:
          "I've always believed that the boldest design decision is often doing less, but doing it with uncompromising precision.",
        click: (c, t) =>
          `Looking at ${c}'s products, I admire that your team refuses to compromise on pure utility and taste. I'd love to bring that disciplined, contrarian perspective to ${c} as a ${t}.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'user_empathy';
    return vibes[chosenVibe];
  }

  // 2. FINTECH / PAYMENTS / BANKING
  if (/fintech|pay|bank|crypto|remit|financ|wallet|checkout|transfer|money|credit/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          "Years ago, I watched a family member's small business nearly collapse because a cross-border supplier payment was stuck in limbo for two weeks with zero transparency. Seeing honest, hardworking people pushed to the brink by broken financial plumbing sparked a permanent conviction in me: money movement shouldn't be an opaque black box.",
        journey: (skills, exp) =>
          `It would shape my entire career trajectory. For the past ${exp}+ years, I have immersed myself in financial technology and high-throughput systems, mastering ${skills}. I've engineered high-reliability pipelines, audited edge cases where a single dropped transaction means a real person doesn't eat, and worked tirelessly to make money movement frictionless.`,
        philosophy:
          "I've always believed that building financial infrastructure isn't just about code, but absolute reliability, security, and human trust.",
        click: (c, t) =>
          `So when I saw what you are building at ${c}, it felt like something clicked. The architecture. The velocity. The commitment to unlocking financial freedom for millions. The chance to build systems where uptime and integrity matter every single second. That's exactly the mission I want to invest my expertise and full energy into as a ${t}.`,
      },
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'During a peak holiday shopping surge at my previous role, a sudden database deadlock in our settlement queue caused transaction failure rates to spike by 1.8%. Spending the night diagnosing race conditions and verifying ledger idempotency taught me that in payments, there is zero margin for sloppy state management.',
        journey: (skills, exp) =>
          `That crucible forged my engineering discipline over ${exp}+ years. Mastering ${skills}, I specialize in building distributed, self-healing payment ledgers, double-entry accounting services, and zero-downtime transactional systems.`,
        philosophy:
          "I've always believed that financial systems demand paranoid rigor, strict mathematical guarantees, and fault-tolerant architecture.",
        click: (c, t) =>
          `Seeing the volume and scale that ${c} processes, it felt like an instant click. The engineering challenges. The high-throughput rails. The opportunity to harden mission-critical pipelines as your next ${t}.`,
      },
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'I was standing in line at a neighborhood pharmacy when an elderly customer’s card was repeatedly declined due to a false-positive fraud heuristic. Seeing their distress over an algorithmic glitch made me passionate about building intelligent risk systems that aggressively stop bad actors without humiliating genuine users.',
        journey: (skills, exp) =>
          `That experience guided my work over the last ${exp}+ years. Specializing in ${skills}, I have built user-first verification flows and fraud-detection layers that protect security while preserving human dignity.`,
        philosophy:
          "I've always believed that exceptional financial technology blends airtight security with profound human empathy.",
        click: (c, t) =>
          `When I read about ${c}'s customer-centric approach to modern finance, it felt like something clicked. The trust. The transparency. The commitment to user-first financial tools. I'd love to bring my background to ${c} as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'The first time I designed an automated multi-currency reconciliation engine that balanced millions in transaction volume down to the exact cent across five payment gateways, I fell in love with the uncompromising precision of financial engineering.',
        journey: (skills, exp) =>
          `That focus on precision has defined my ${exp}+ years in the industry. Leveraging ${skills}, I build audit-proof backend architectures, webhook delivery systems with guaranteed delivery semantics, and rock-solid API integrations.`,
        philosophy:
          "I've always believed that financial software should be mathematically airtight, completely traceable, and engineered for perpetual reliability.",
        click: (c, t) =>
          `When I examined the technical bar of ${c}'s engineering team, it felt like something clicked. The standards. The architecture. The chance to build bulletproof financial rails as a ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I helped deploy a localized QR payment solution for informal merchants from scratch. Seeing vendors who had never accepted digital payments before grow their monthly turnover by 35% in three months showed me the undeniable economic power of well-executed financial technology.',
        journey: (skills, exp) =>
          `That passion for tangible economic impact has driven my ${exp}+ years in the field. Specializing in ${skills}, I focus on fast execution, intuitive checkout experiences, and removing barriers to financial access.`,
        philosophy:
          "I've always believed that great financial infrastructure unlocks generational prosperity when built with speed and local context.",
        click: (c, t) =>
          `So when I discovered ${c}'s ambitious expansion and product roadmap, it felt like something clicked. The momentum. The mission. The opportunity to build transformative financial products as a ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'When conventional wisdom insisted that complex financial systems required slow, bureaucratic release cadences and layers of manual reconciliation, I challenged that premise by introducing automated idempotent verification and continuous auditability.',
        journey: (skills, exp) =>
          `Backing non-consensus ideas with rigorous execution has driven my work for ${exp}+ years. Using ${skills}, I prove that high-velocity engineering and audit-grade safety are not trade-offs, but mutual accelerators.`,
        philosophy:
          "I believe the biggest leaps in financial technology come from questioning outdated operational dogmas while protecting customer trust with mathematical rigor.",
        click: (c, t) =>
          `What excites me most about ${c} is your willingness to disrupt established financial norms. I'd love to bring my conviction and technical depth to ${c} as your next ${t}.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'origin_spark';
    return vibes[chosenVibe];
  }

  // 3. CLIMATE / WATER / SUSTAINABILITY / CLEAN ENERGY
  if (/water|climate|green|sustainab|environment|hydro|clean\s*energy|carbon|solar|ecology/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          'At age ten, I missed an entire week of school once because our municipal water well dried up. My mother waited in line for hours at a government tanker that never came. That memory has stayed with me, not just as something painful, but as a quiet, permanent reminder of how deeply life depends on robust, resilient resource systems.',
        journey: (skills, exp) =>
          `It would shape everything that came after. Over the last ${exp}+ years, I have dedicated myself to environmental and system technologies, specializing in ${skills}. I have worked on frontline adaptation initiatives, collaborated with cross-functional partners to find sustainable solutions, and built systems designed for real-world durability.`,
        philosophy:
          "I've always believed that solving environmental and resource challenges doesn't only involve science, but scale, trust, and relentless urgency.",
        click: (c, t) =>
          `So when I read about what you're building at ${c}, it felt like something clicked. The mission. The technology. The global ambition. The chance to step up where the stakes are high and solve critical resource frontiers before they impact entire populations. That's exactly the kind of work I want to give my time, energy, and experience to as your next ${t}.`,
      },
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'After witnessing an unprecedented regional grid failure during an extreme weather event leave over a million households without power and water for four days, I realized that climate adaptation is no longer a distant forecast—it is the defining, urgent engineering frontier of our lifetime.',
        journey: (skills, exp) =>
          `That urgency has guided the past ${exp}+ years of my career. Specializing in ${skills}, I build resilient telemetry platforms, predictive resource modeling software, and distributed grid automation systems.`,
        philosophy:
          "I've always believed that climate technologies must be built for extreme environmental stress, decentralized operation, and planetary scale.",
        click: (c, t) =>
          `When I discovered ${c}'s mission to tackle critical climate infrastructure, it felt like something clicked. The ambition. The engineering depth. The opportunity to build systems that protect communities at scale as a ${t}.`,
      },
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'I spent weeks in agricultural communities listening to smallholder farmers explain how unpredictable weather and water shortages were threatening multi-generational family lands. It taught me that climate technology is futile unless it is practical, accessible, and designed for the real people on the ground.',
        journey: (skills, exp) =>
          `That community grounding has shaped my ${exp}+ years in the field. Specializing in ${skills}, I focus on intuitive data dashboards, low-bandwidth telemetry, and actionable decision-support tools for field operators.`,
        philosophy:
          "I've always believed that sustainability initiatives succeed only when they deliver clear, dependable daily value to frontline users.",
        click: (c, t) =>
          `So when I saw ${c}'s grassroots impact and technical execution, it felt like something clicked. The purpose. The team. The chance to create meaningful change as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'Auditing industrial energy and water consumption data revealed how massive volumes of resources are lost simply due to lack of real-time monitoring and automated closed-loop controls. Realizing the immense impact of predictive systems hooked me on resource engineering.',
        journey: (skills, exp) =>
          `That analytical focus has driven my ${exp}+ years of experience. Working with ${skills}, I design optimized data pipelines, IoT sensor ingestion engines, and high-precision modeling algorithms.`,
        philosophy:
          "I've always believed that sustainability is achieved by combining rigorous physical science with world-class software engineering.",
        click: (c, t) =>
          `Seeing how ${c} leverages modern technology to tackle resource scarcity felt like an exact match for my background. I would love to bring my technical skills to ${c} as a ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I helped deploy our team’s first remote environmental sensing hub in an off-grid catchment area. When the first live telemetry packet transmitted successfully across satellite links to our dashboard, it proved how modern software can illuminate previously unmonitored frontiers.',
        journey: (skills, exp) =>
          `That drive for hands-on deployment has defined my ${exp}+ years of work. Specializing in ${skills}, I thrive on rapid prototyping, rugged field hardware/software integration, and shipping dependable systems.`,
        philosophy:
          "I've always believed in fast execution, rugged field validation, and turning bold environmental ideas into operational realities.",
        click: (c, t) =>
          `When I read about ${c}'s technological approach, it felt like something clicked. The velocity. The global mission. The chance to build solutions where the stakes are highest as your next ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'When prevailing practices treated climate solutions as compliance checkboxes or greenwashing PR, I pushed for measurable, first-principles resource efficiency and unit-economic viability that proved clean technology can outperform legacy systems on pure merits.',
        journey: (skills, exp) =>
          `That contrarian discipline has driven my ${exp}+ years. Using ${skills}, I turn sustainability goals into high-uptime telemetry pipelines, automated optimization engines, and verifiable metrics.`,
        philosophy:
          "I've always believed that sustainable impact requires undeniable economic reality and systems-level engineering discipline.",
        click: (c, t) =>
          `Seeing how ${c} tackles hard real-world constraints without superficial shortcuts resonates with how I build. I'd love to join as a ${t}.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'origin_spark';
    return vibes[chosenVibe];
  }

  // 4. HEALTHCARE / BIOTECH / HEALTHTECH
  if (/health|bio|med|clinic|patient|care|pharma|therap|doctor|hospital/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          'Early in my journey, I spent weeks in a hospital supporting a loved one and watched how fragmented, antiquated software forced doctors and nurses to spend more time fighting screens than caring for patients. That visual stayed with me as a quiet reminder of how much human suffering can be mitigated when healthcare tools are built with empathy and precision.',
        journey: (skills, exp) =>
          `It guided every step that followed. Over the past ${exp}+ years, I have specialized in ${skills}, building resilient, compliant systems that simplify clinical workflows and protect vital patient data. I've partnered directly with practitioners, listening to their daily friction to deliver software that genuinely helps.`,
        philosophy:
          "I've always believed that solving healthcare challenges doesn't only require technical sophistication, but deep empathy, clinical safety, and uncompromising rigor.",
        click: (c, t) =>
          `So when I saw ${c}'s mission, it felt like something clicked. The focus. The technological standard. The real human impact. The opportunity to build software that directly elevates care and saves lives. That is precisely where I want to focus my career as a ${t}.`,
      },
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'I witnessed a critical lab diagnostic result get delayed by almost 24 hours because of an integration timeout between legacy hospital systems. In healthcare, latency and data corruption are never just technical bugs—they have profound consequences on patient outcomes.',
        journey: (skills, exp) =>
          `That realization has anchored my ${exp}+ years in software. Specializing in ${skills}, I architect fault-tolerant, HL7/FHIR-compliant pipelines that guarantee message delivery and sub-second diagnostic processing.`,
        philosophy:
          "I've always believed that medical software must operate with zero-tolerance for downtime and absolute data integrity.",
        click: (c, t) =>
          `When I discovered ${c}'s clinical infrastructure, it felt like an instant click. The reliability. The standards. The opportunity to build mission-critical systems as a ${t}.`,
      },
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'While conducting user interviews with chronic care patients, an elderly patient told me: "I just want to manage my medications without feeling overwhelmed by complex menus." That conversation grounded my conviction that clinical software should communicate with warmth, clarity, and zero confusing jargon.',
        journey: (skills, exp) =>
          `Over ${exp}+ years specializing in ${skills}, I have championed patient-first interfaces and intuitive provider workflows that reduce burnout and make healthcare navigation effortless.`,
        philosophy:
          "I've always believed that empowering patients with clear, accessible digital tools is one of the highest leverage ways to improve public health.",
        click: (c, t) =>
          `Seeing how ${c} puts patient experience at the center of innovation felt like something clicked. I would love to bring my skills to ${c} as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'Architecting a HIPAA-compliant, end-to-end encrypted medical data platform that unified disparate electronic health records showed me how transformative clean, secure data infrastructure is for clinical teams.',
        journey: (skills, exp) =>
          `That architectural discipline has defined my ${exp}+ years in tech. Working with ${skills}, I build secure APIs, auditable data storage layers, and compliant cloud architectures.`,
        philosophy:
          "I've always believed that great healthtech combines rigorous compliance, ironclad security, and effortless usability.",
        click: (c, t) =>
          `When I learned about ${c}'s technological roadmap, it felt like something clicked. The standards. The mission. The chance to build secure healthcare systems as a ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I helped build and launch a virtual triage platform that connected underserved rural clinics with medical specialists in under ten minutes. Hearing providers say "this changed how we save lives in remote areas" confirmed why I dedicate my career to health technology.',
        journey: (skills, exp) =>
          `That drive for direct clinical impact has guided my ${exp}+ years. Specializing in ${skills}, I focus on high-velocity product execution and building software that directly expands access to care.`,
        philosophy:
          "I've always believed that modern technology should aggressively eliminate geographical and logistical barriers to world-class medicine.",
        click: (c, t) =>
          `So when I saw ${c}'s rapid growth and vision, it felt like an instant click. The urgency. The reach. The chance to contribute as your next ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'In a sector where technology adoption is notoriously bogged down by archaic legacy software and risk aversion, I challenged standard dogma by showing that modern, consumer-grade UX and rapid iterations can coexist seamlessly with stringent HIPAA compliance.',
        journey: (skills, exp) =>
          `Advocating that clinicians and patients deserve software that respects their dignity has shaped my ${exp}+ years. Using ${skills}, I deliver compliant platforms that eliminate bureaucratic drag and elevate care delivery.`,
        philosophy:
          "I believe healthcare innovation happens when we stop excusing broken user experiences as unavoidable regulatory costs.",
        click: (c, t) =>
          `The bold, patient-first modernization ${c} brings to healthcare is truly inspiring. I'd love to contribute as a ${t}.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'origin_spark';
    return vibes[chosenVibe];
  }

  // 5. AI / DATA SCIENCE / MACHINE LEARNING
  if (/ai|ml|machine\s*learning|data|intelligence|deep\s*learning|llm|nlp/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          'I still remember the first time I built a pipeline that turned millions of rows of noisy, incomprehensible data into a single, sharp insight that prevented a critical operational failure. Seeing chaos transform into actionable intelligence gave me a lasting appreciation for the immense leverage of smart data systems.',
        journey: (skills, exp) =>
          `That curiosity has driven my career for the last ${exp}+ years. I have specialized in ${skills}, building production-grade data pipelines, training robust models, and translating complex mathematical concepts into reliable software that real teams can use to make better decisions.`,
        philosophy:
          "I've always believed that artificial intelligence and data science shouldn't just be about algorithmic complexity, but real-world utility, safety, and verifiable impact.",
        click: (c, t) =>
          `So when I read about what ${c} is doing in this space, it felt like something clicked. The ambition. The technical depth. The chance to solve unsolved problems at scale. That is exactly the work I want to dedicate my focus and energy to as a ${t}.`,
      },
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'I once saw an un-evaluated machine learning model introduce subtle, cascading hallucination errors across a production decision system. That sobering experience instilled in me a permanent commitment to automated eval benchmarks, deterministic regression guardrails, and rigorous safety controls.',
        journey: (skills, exp) =>
          `That commitment has anchored my ${exp}+ years in AI. Specializing in ${skills}, I architect robust evaluation pipelines, model alignment guardrails, and observable inference services.`,
        philosophy:
          "I've always believed that building production AI requires defensive engineering, grounded truth, and continuous automated verification.",
        click: (c, t) =>
          `When I looked into ${c}'s engineering rigor and high-bar AI deployment, it felt like an instant click. The depth. The standards. The chance to build bulletproof AI systems as a ${t}.`,
      },
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'I built an intelligent assistant that automated hours of manual query writing for a non-technical analytics team. Hearing the team lead say "You just turned our four-hour morning scramble into a thirty-second conversational answer" showed me how AI creates magic when it genuinely empowers human workers.',
        journey: (skills, exp) =>
          `Over ${exp}+ years specializing in ${skills}, I have focused on closing the gap between cutting-edge models and seamless, intuitive interfaces that non-experts can leverage immediately.`,
        philosophy:
          "I've always believed that artificial intelligence achieves its highest purpose when it amplifies human agency rather than complicating it.",
        click: (c, t) =>
          `Seeing how ${c} designs user-centered AI products felt like an exact match for my philosophy. I'd love to contribute my experience to ${c} as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'Optimizing a high-throughput LLM serving pipeline from 3.5 seconds down to sub-400ms time-to-first-token while cutting GPU compute overhead by 55% taught me that real-world AI engineering is an art of relentless systems profiling, caching, and execution efficiency.',
        journey: (skills, exp) =>
          `That systems-level focus has defined my ${exp}+ years in tech. Working with ${skills}, I build low-latency inference architectures, streaming endpoints, and scalable vector retrieval pipelines.`,
        philosophy:
          "I've always believed that great AI engineering marries algorithmic insight with low-latency systems craftsmanship.",
        click: (c, t) =>
          `When I discovered ${c}'s performance standards and technical ambition, it felt like something clicked. The scale. The latency obsession. The opportunity to build world-class AI infrastructure as a ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I fine-tuned and deployed a specialized domain model on proprietary datasets from scratch, watching it outperform massive generalist APIs on our company’s toughest classification edge cases. That proved that focused domain intelligence will always beat generic solutions.',
        journey: (skills, exp) =>
          `That builder mentality has driven my ${exp}+ years in the field. Specializing in ${skills}, I love rapidly turning raw research ideas into deployable, customer-facing AI features.`,
        philosophy:
          "I've always believed in building targeted, purpose-driven intelligence that solves specific domain bottlenecks with high accuracy.",
        click: (c, t) =>
          `So when I learned about ${c}'s bold product vision, it felt like an instant click. The velocity. The innovation. The chance to build novel AI products as a ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'While the industry got caught in the speculative hype of blindly wrapping third-party foundational models, I insisted on first-principles data curation, deterministic eval benchmarks, and fine-tuning lightweight architectures that slashed inference costs by 70%.',
        journey: (skills, exp) =>
          `Proving that domain precision trumps brute-force parameter counts has defined my ${exp}+ years. Leveraging ${skills}, I build defensible, cost-effective AI systems grounded in verifiable business utility.`,
        philosophy:
          "I believe sustainable AI moats aren't built on hype, but on disciplined data flywheels, rigorous evals, and low-latency execution.",
        click: (c, t) =>
          `Your pragmatic, high-impact approach to AI at ${c} resonates deeply with my philosophy. I'd love to join as a ${t} to build models that drive real value.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'origin_spark';
    return vibes[chosenVibe];
  }

  // 6. BACKEND / CLOUD / DEVOPS / INFRASTRUCTURE
  if (/infra|backend|cloud|devops|platform|sre|distributed|scalab/i.test(combined)) {
    const vibes: Record<StoryVibeId, DomainStoryArc> = {
      high_stakes_scale: {
        vibeId: 'high_stakes_scale',
        origin:
          'Early in my journey, during a high-stakes launch, an unexpected cascading failure brought our entire service down. Spending eighteen consecutive hours tracing distributed race conditions and rebuilding our failover architecture taught me a lifelong respect for the invisible backbone that keeps modern society running.',
        journey: (skills, exp) =>
          `That discipline has guided the past ${exp}+ years of my career. I have specialized in ${skills}, architecting fault-tolerant backend services, optimizing concurrency, and ensuring zero-downtime rollouts even during massive traffic spikes.`,
        philosophy:
          "I've always believed that great infrastructure should be like oxygen: invisible when it works, but engineered with absolute rigor so it never fails when people need it most.",
        click: (c, t) =>
          `When I looked into ${c}'s engineering challenges, it felt like something clicked. The scale. The architectural standards. The opportunity to build bulletproof systems that power critical workflows. That's exactly where I want to bring my experience as a ${t}.`,
      },
      craft_resilience: {
        vibeId: 'craft_resilience',
        origin:
          'I spent months untangling a brittle, monolithic codebase into high-cohesion, asynchronous event-driven services with zero customer-facing downtime. Watching team deployment frequency jump from once every two weeks to multiple times a day proved how transformative robust architecture is for overall company velocity.',
        journey: (skills, exp) =>
          `That passion for clean systems has anchored my ${exp}+ years in software. Specializing in ${skills}, I design maintainable microservices, resilient event streaming pipelines, and clean database access layers.`,
        philosophy:
          "I've always believed that great software architecture is measured by how safely and rapidly it allows other engineers to ship with confidence.",
        click: (c, t) =>
          `Seeing the engineering standards and codebase quality at ${c}, it felt like an instant click. The craftsmanship. The architecture. The chance to build scalable systems as a ${t}.`,
      },
      user_empathy: {
        vibeId: 'user_empathy',
        origin:
          'I once spent a day shadowing our internal support team dealing with slow database queries and timeout errors. Seeing their daily frustration firsthand motivated me to rewrite our query planner and add distributed caching, turning agonizing multi-second delays into snappy sub-50ms responses.',
        journey: (skills, exp) =>
          `Over ${exp}+ years specializing in ${skills}, I have treated internal developer and operational velocity with the same reverence as customer-facing features.`,
        philosophy:
          "I've always believed that backend performance and tooling directly influence developer happiness and organizational momentum.",
        click: (c, t) =>
          `When I learned about ${c}'s dedication to engineering culture and infrastructure tooling, it felt like something clicked. I would love to bring my experience to ${c} as a ${t}.`,
      },
      origin_spark: {
        vibeId: 'origin_spark',
        origin:
          'I still remember the first time I configured a distributed cluster of servers that automatically balanced load and seamlessly healed after a simulated node failure. Seeing multiple independent nodes coordinate state in harmony sparked my permanent fascination with distributed systems.',
        journey: (skills, exp) =>
          `That fascination has driven my ${exp}+ years in engineering. Specializing in ${skills}, I build resilient consensus protocols, high-availability data layers, and cloud-native services.`,
        philosophy:
          "I've always believed that exceptional infrastructure is built on simplicity, immutability, and ruthless fault-isolation.",
        click: (c, t) =>
          `So when I read about the backend architecture at ${c}, it felt like an instant click. The technical depth. The concurrency challenges. The chance to contribute as your next ${t}.`,
      },
      zero_to_one: {
        vibeId: 'zero_to_one',
        origin:
          'I provisioned our entire cloud infrastructure from a completely clean state using Terraform and Kubernetes, setting up automated CI/CD, secret management, and distributed tracing from day one. Enabling developers to deploy their first microservice to production in under five minutes set the gold standard for my work.',
        journey: (skills, exp) =>
          `That builder drive has guided my ${exp}+ years. Mastering ${skills}, I love turning infrastructure ambiguity into structured, self-serve developer platforms.`,
        philosophy:
          "I've always believed that investing in automated, reproducible infrastructure is the highest leverage force multiplier an engineering team can have.",
        click: (c, t) =>
          `When I saw ${c}'s rapid scaling trajectory, it felt like something clicked. The momentum. The challenges. The opportunity to build scalable cloud foundations as a ${t}.`,
      },
      bold_contrarian: {
        vibeId: 'bold_contrarian',
        origin:
          'When everyone was blindly adopting hyper-complex microservices and over-engineered distributed meshes for simple workloads, I championed boring, robust architecture and zero-dependency primitives that delivered 10x lower latency and zero 3 AM alerts.',
        journey: (skills, exp) =>
          `Over ${exp}+ years, that independent mindset guided my work with ${skills}. I build resilient systems designed around clear data models and mechanical sympathy rather than resume-driven development.`,
        philosophy:
          "I've always believed that the best architectural choice is the simplest one that solves the hard problem under real production constraints.",
        click: (c, t) =>
          `Reading about ${c}'s engineering culture, I see a team that values real performance over tech hype. That's the exact arena where I want to contribute as a ${t}.`,
      },
    };
    const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'high_stakes_scale';
    return vibes[chosenVibe];
  }

  // 7. GENERAL CRAFT & ENGINEERING DEFAULT
  const vibes: Record<StoryVibeId, DomainStoryArc> = {
    origin_spark: {
      vibeId: 'origin_spark',
      origin:
        'Early in my career, I built a small internal tool that turned a painful three-day manual chore for our operations team into a five-minute automated workflow. Seeing the relief on people’s faces and hearing them say "you gave us our evenings back" permanently hooked me on the power of thoughtful, high-impact craft.',
      journey: (skills, exp) =>
        `It became the north star for everything I do. Over the past ${exp}+ years, I have honed my expertise in ${skills}, taking full ownership of complex projects from initial ambiguity to resilient, polished execution.`,
      philosophy:
        "I've always believed that exceptional work doesn't just come from technical proficiency, but from deep ownership, clear communication, and caring relentlessly about the end result.",
      click: (c, t) =>
        `So when I learned about ${c}'s vision and the high bar of your team, it felt like something clicked. The mission. The standards. The chance to solve meaningful problems alongside passionate builders. That's exactly the kind of work I want to give my time, energy, and experience to as your next ${t}.`,
    },
    user_empathy: {
      vibeId: 'user_empathy',
      origin:
        'I spent weeks analyzing customer feedback and realized that users were churning not because of missing features, but because of confusing jargon and hidden friction points. Simplifying the workflow and removing unnecessary steps boosted user activation by 32% in one quarter.',
      journey: (skills, exp) =>
        `That user-first mindset has guided my ${exp}+ years of experience. Specializing in ${skills}, I take pride in uncovering unspoken user needs, streamlining complex processes, and building products people genuinely love using.`,
      philosophy:
        "I've always believed that the best products are built by listening deeply to users and relentlessly stripping away friction.",
      click: (c, t) =>
        `Seeing how ${c} puts user value at the core of its product culture felt like an exact match for my philosophy. I'd love to bring my expertise to ${c} as a ${t}.`,
    },
    high_stakes_scale: {
      vibeId: 'high_stakes_scale',
      origin:
        'I took full ownership of a mission-critical initiative with an unmovable launch deadline when key dependencies stalled. By breaking down bottlenecks, aligning cross-functional stakeholders, and maintaining high execution standards under pressure, we shipped a flawless v1 on time.',
      journey: (skills, exp) =>
        `That composure under pressure has defined my ${exp}+ years in the industry. Specializing in ${skills}, I excel at cutting through ambiguity, managing risks proactively, and delivering dependable business outcomes.`,
      philosophy:
        "I've always believed in calm intensity, clear prioritization, and taking extreme ownership of outcomes when the stakes are highest.",
      click: (c, t) =>
        `When I looked at ${c}'s rapid growth and ambitious goals, it felt like an instant click. The high standards. The pace. The opportunity to hit the ground running as your next ${t}.`,
    },
    craft_resilience: {
      vibeId: 'craft_resilience',
      origin:
        'A mentor once taught me: "The difference between good work and exceptional work is what happens when unexpected edge cases occur." That principle has guided every system, process, and workflow I have engineered ever since.',
      journey: (skills, exp) =>
        `That commitment to craftsmanship has propelled my ${exp}+ years of professional growth. Mastering ${skills}, I build systems designed for long-term maintainability, clarity, and resilience.`,
      philosophy:
        "I've always believed that lasting excellence comes from intentionality, high standards, and caring deeply about the details that matter.",
      click: (c, t) =>
        `When I learned about ${c}'s culture and high engineering bar, it felt like something clicked. The craft. The mission. The chance to build meaningful products as a ${t}.`,
    },
    zero_to_one: {
      vibeId: 'zero_to_one',
      origin:
        'I took a product concept from a vague two-paragraph whiteboard sketch all the way through architecture, design, and release, directly securing our first thousand active users. Navigating the unknown and turning raw ideas into working reality is what fuels my energy every day.',
      journey: (skills, exp) =>
        `That entrepreneurial builder drive has defined my ${exp}+ years in the field. Specializing in ${skills}, I thrive in fast-moving environments where velocity, tight feedback loops, and tangible results matter most.`,
      philosophy:
        "I've always believed in high agency, rapid iteration, and delivering value early and often.",
      click: (c, t) =>
        `When I saw the pace of execution and vision at ${c}, it felt like an instant click. The velocity. The mission. The chance to build transformative software as your next ${t}.`,
    },
    bold_contrarian: {
      vibeId: 'bold_contrarian',
      origin:
        'Throughout my career, I noticed that teams often default to safe consensus, only to produce incremental, mediocre results. I have consistently challenged comfortable assumptions, advocating for bold, high-conviction paths that unlocked step-function business growth.',
      journey: (skills, exp) =>
        `Over the past ${exp}+ years, I have combined that contrarian courage with deep hands-on mastery in ${skills}, turning ambitious, unconventional bets into dependable, revenue-generating reality.`,
      philosophy:
        "I believe outsized impact belongs to those who ask 'why not?' and back their conviction with world-class craftsmanship and relentless execution.",
      click: (c, t) =>
        `Seeing how ${c} leads from the front and takes calculated, visionary bets makes me thrilled. I'd love to bring that high-conviction mindset to ${c} as a ${t}.`,
    },
  };
  const chosenVibe = vibeId && vibes[vibeId] ? vibeId : 'origin_spark';
  return vibes[chosenVibe];
}

export function generateFollowUpEmail(params: FollowUpEmailParams): { subject: string; body: string } {
  const contact = params.contactName && params.contactName.trim() ? params.contactName.trim() : 'Hiring Team';
  const summary = params.userSummary ? `\n\nAs a quick reminder, ${params.userSummary}` : '';

  if (params.followUpNumber === 1) {
    return {
      subject: `Following up: ${params.jobTitle} application — ${params.userName}`,
      body: `Hi ${contact},

I hope you're having a productive week.

I wanted to quickly follow up on my application for the ${params.jobTitle} position at ${params.company} submitted ${params.daysSinceApplied} days ago. Everything I've learned about your team's mission and culture continues to make this role my top priority.${summary}

Please let me know if there are any questions, portfolio pieces, or code samples I can provide to assist in your review. I would welcome the chance to explore how my experience can support ${params.company}'s upcoming milestones.

Warm regards,

${params.userName}`,
    };
  } else if (params.followUpNumber === 2) {
    return {
      subject: `Checking in: ${params.jobTitle} role at ${params.company} — ${params.userName}`,
      body: `Hi ${contact},

I hope you're doing well.

I know your team is actively reviewing candidates, so I'll keep this brief. I'm writing to check in on the status of the ${params.jobTitle} opening. I remain very enthusiastic about the chance to bring my experience to ${params.company}.${summary}

If the position has already moved to late-stage interviews or has been filled, I completely understand and would appreciate a quick note so I can plan accordingly.

Thank you again for your time and consideration.

Warm regards,

${params.userName}`,
    };
  } else {
    return {
      subject: `Final check-in regarding ${params.jobTitle} — ${params.userName}`,
      body: `Hi ${contact},

I hope all is well with you.

I'm sending a final check-in regarding my application for the ${params.jobTitle} position. I have immense respect for what ${params.company} is building and would have loved the opportunity to contribute.${summary}

If the role has been closed, no worries at all—I wish your team continued success with your product and growth. Should another opportunity arise in the future that fits my background, I would be glad to stay in touch.

Thank you again for your time.

Warm regards,

${params.userName}`,
    };
  }
}

/**
 * Generates Story-Driven, authentic cold outreach across Email, LinkedIn, and Twitter/X.
 */
export function generateColdDM(params: ColdDMParams): string {
  const contact = params.contactName && params.contactName.trim() ? params.contactName.trim() : 'there';
  const safeSkills = Array.isArray(params.keySkills) ? params.keySkills.filter(Boolean) : [];
  const skills = safeSkills.length > 0 ? safeSkills.slice(0, 4).join(', ') : 'modern engineering methodologies';
  const exp = params.experienceYears || 5;
  const safeTitle = params.jobTitle || 'Role';
  const safeCompany = params.company || 'Company';
  const safeUserName = params.userName || 'Candidate';

  const arc = getDomainStoryArc(safeTitle, safeCompany, params.domain, params.vibeId);
  const originText = params.customStory && params.customStory.trim().length > 20 ? params.customStory.trim() : arc.origin;

  // 1. Twitter / X (crisp, personal, under 280 chars)
  if (params.platform === 'twitter') {
    return `Hi ${contact}! ${arc.philosophy} I've spent ${exp}+ yrs working with ${skills}. Seeing what you're building at ${safeCompany} felt like an instant click. Would love to explore how I could contribute to the ${safeTitle} role! - ${safeUserName}`;
  }

  // 2. LinkedIn DM (punchy 3-paragraph narrative under 150 words)
  if (params.platform === 'linkedin') {
    return `Hi ${contact},

${originText.slice(0, 180)}... That formative experience shaped my entire career. Over the past ${exp}+ years, I have specialized in ${skills}, building resilient, high-impact systems.

When I saw what you're building at ${safeCompany}, it felt like something clicked. The mission, the standard of craft, and the chance to tackle high-stakes challenges as your next ${safeTitle}.

If you're still looking for someone who can step in and take full ownership, I'd love to connect and explore how I could contribute.

Warm regards,
${safeUserName}`;
  }

  // 3. Email / Long-form Cold Outreach (The exact four-paragraph authentic story structure from the reference image!)
  return `Hi ${contact},

${originText}

${arc.journey(skills, exp)} ${arc.philosophy}

${arc.click(safeCompany, safeTitle)}

If you're still looking for someone to hit the ground running and take full ownership of this role, I'd love to explore how I could contribute.

Warm Regards,

${safeUserName}`;
}

export function generateThankYouEmail(params: ThankYouParams): { subject: string; body: string } {
  const discussionPoints = params.keyDiscussionPoints
    ? `\n\nI particularly enjoyed our conversation about ${params.keyDiscussionPoints}. It further confirmed for me that ${params.company}'s culture and technical bar are exactly the kind of environment where I do my best work.`
    : '';

  return {
    subject: `Thank You — ${params.jobTitle} conversation — ${params.userName}`,
    body: `Hi ${params.interviewerName},

Thank you so much for taking the time to speak with me today about the ${params.jobTitle} position at ${params.company}. It was an absolute pleasure learning more about your team's upcoming roadmap and technical vision.${discussionPoints}

Our conversation reinforced my excitement about the opportunity. I am confident that my experience and hands-on approach will allow me to make an immediate, meaningful impact on your team.

Please let me know if you need any follow-up information or work samples from my end. I look forward to hearing about the next steps.

Warm regards,

${params.userName}`,
  };
}

/**
 * Generates tailored cover notes & key talking points for a specific job across any profession,
 * with an authentic, story-driven, mission-aligned tone.
 */
export function generateTailoredPitch(
  job: JobListing,
  userSkills: string[] = ['Problem Solving', 'Execution']
) {
  const safeTags = Array.isArray(job?.tags) ? job.tags.filter(Boolean) : [];
  const safeUserSkills = Array.isArray(userSkills) ? userSkills.filter(Boolean) : ['Problem Solving', 'Execution'];
  const topSkills = safeTags.slice(0, 3).join(', ') || safeUserSkills.slice(0, 3).join(', ');
  const safeTitle = job?.title || 'Role';
  const safeCompany = job?.company || 'Company';
  const arc = getDomainStoryArc(safeTitle, safeCompany);

  return {
    pitch_bullets: [
      `Formative connection to the problem space: ${arc.origin.slice(0, 140)}...`,
      `Deep practical craftsmanship in ${topSkills || 'relevant methodologies'}, built on ownership and measurable outcomes.`,
      `Genuine mission alignment with ${safeCompany}: eager to tackle high-stakes challenges as your next ${safeTitle}.`,
    ],
    cover_note: `Hi ${safeCompany} Team,\n\n${arc.origin}\n\nOver the past several years, I have specialized in ${topSkills}, taking full ownership of complex projects and building systems engineered for real-world impact. ${arc.philosophy}\n\n${arc.click(safeCompany, safeTitle)}\n\nIf you're still looking for someone who can step in and take full ownership, I'd love to explore how I could contribute.\n\nWarm Regards,`,
    interview_tips: [
      `Anchor your answers in a real origin story: share the specific moment or problem that made you passionate about ${safeTags[0] || safeTitle}.`,
      `Prepare 2 concrete examples demonstrating deep ownership, resilience under pressure, and how you delivered measurable business results.`,
      `Research ${safeCompany}'s core mission and be ready to articulate why their specific product and challenges matter deeply to you.`,
    ],
  };
}
