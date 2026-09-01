import { getDomainStoryArc, StoryVibeId } from './follow-up-generator';

export type CoverLetterTone = 'story' | 'confident' | 'executive' | 'enthusiastic' | 'technical';

export interface CoverLetterParams {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  jobTitle: string;
  company: string;
  hiringManager?: string;
  tone: CoverLetterTone;
  keySkills?: string[];
  experienceYears?: number;
  location?: string;
  vibeId?: StoryVibeId;
  customStory?: string;
}

export function generateCoverLetter(params: CoverLetterParams): {
  subject: string;
  body: string;
  toneLabel: string;
} {
  const {
    candidateName = 'Candidate Name',
    jobTitle = 'Position',
    company = 'Company',
    hiringManager,
    tone = 'story',
    keySkills = [],
    experienceYears = 5,
    vibeId,
    customStory,
  } = params;

  const recipient = hiringManager && hiringManager.trim() ? hiringManager.trim() : 'Hiring Team';
  const topSkillsList = keySkills.length > 0 ? keySkills.slice(0, 4).join(', ') : 'modern industry methodologies';
  const skillsSentence = keySkills.length > 0 ? keySkills.slice(0, 3).join(', ') : 'scalable problem solving';

  let subject = '';
  let body = '';
  let toneLabel = '';

  switch (tone) {
    case 'story': {
      toneLabel = 'Story-Driven & Mission Hook';
      subject = `${jobTitle} — ${candidateName}`;
      const arc = getDomainStoryArc(jobTitle, company, undefined, vibeId);
      const origin = customStory && customStory.trim().length > 20 ? customStory.trim() : arc.origin;

      body = `Hi ${recipient},

${origin}

${arc.journey(topSkillsList, experienceYears)} ${arc.philosophy}

${arc.click(company, jobTitle)}

If you're still looking for someone to hit the ground running and take full ownership of this role, I'd love to explore how I could contribute.

Warm Regards,

${candidateName}
${params.candidatePhone ? `${params.candidatePhone}  •  ` : ''}${params.candidateEmail || ''}`;
      break;
    }

    case 'executive':
      toneLabel = 'Executive & Strategic';
      subject = `Application for ${jobTitle} — ${candidateName}`;
      body = `Dear ${recipient} at ${company},

I am writing to formally submit my candidacy for the ${jobTitle} position at ${company}. With over ${experienceYears}+ years of progressive experience delivering high-impact business outcomes, architecting strategic initiatives, and leading cross-functional execution, I have developed a strong track record of driving measurable growth and operational excellence.

Throughout my career, I have specialized in ${topSkillsList}. At my previous organizations, I have focused on translating ambitious organizational roadmaps into scalable, high-performing systems while maintaining rigorous quality standards and accelerating time-to-market. My approach centers on strategic alignment, data-informed prioritization, and empowering teams to consistently exceed key performance indicators.

What particularly excites me about ${company} is your commitment to industry innovation and high-standard execution. I am eager to leverage my background in ${skillsSentence} to contribute directly to your upcoming milestones, optimize operational velocity, and champion key initiatives that drive long-term enterprise value.

Thank you for your time and consideration. I welcome the opportunity to discuss how my leadership experience and technical capabilities align with ${company}'s strategic goals.

Sincerely,

${candidateName}
${params.candidatePhone ? `${params.candidatePhone}  •  ` : ''}${params.candidateEmail || ''}`;
      break;

    case 'confident':
      toneLabel = 'Confident & Direct';
      subject = `${jobTitle} Application — ${candidateName}`;
      body = `Dear ${recipient} at ${company},

I am excited to apply for the ${jobTitle} role at ${company}. With ${experienceYears}+ years of hands-on experience specializing in ${topSkillsList}, I bring a proven track record of solving complex challenges, shipping resilient solutions, and driving rapid business results.

In my recent roles, I have taken full ownership of critical initiatives from initial concept through production rollout. Whether optimizing workflow efficiency, collaborating with stakeholders, or mastering ${skillsSentence}, I pride myself on velocity, clean execution, and delivering work that creates genuine customer and commercial impact.

I have followed ${company}'s growth and appreciate your high bar for product excellence. I am confident that my background, direct problem-solving style, and depth in ${topSkillsList} will enable me to make an immediate, tangible impact on your team from day one.

I would love to connect and discuss how I can help ${company} achieve its next chapter of growth.

Best regards,

${candidateName}
${params.candidatePhone ? `${params.candidatePhone}  •  ` : ''}${params.candidateEmail || ''}`;
      break;

    case 'enthusiastic':
      toneLabel = 'Enthusiastic & Engaging';
      subject = `Passionate ${jobTitle} for ${company} — ${candidateName}`;
      body = `Dear ${recipient} at ${company},

I was thrilled to discover the ${jobTitle} opening at ${company}! As someone who deeply admires your mission and culture of innovation, I would be delighted to bring my ${experienceYears}+ years of experience and passion for ${topSkillsList} to your talented team.

Over the past several years, I have dedicated myself to mastering ${skillsSentence}. I thrive in collaborative, fast-moving environments where I can partner closely with brilliant colleagues to build memorable user experiences and solve meaningful problems. Colleagues know me as a proactive contributor who brings high energy, empathy, and persistent curiosity to every project.

Joining ${company} represents an incredible opportunity to contribute to a product and vision I genuinely believe in. I am eager to bring my enthusiasm, strong work ethic, and expertise in ${topSkillsList} to help scale your impact.

Thank you so much for considering my application. I would love the chance to speak with you about how we can build great things together!

Warm regards,

${candidateName}
${params.candidatePhone ? `${params.candidatePhone}  •  ` : ''}${params.candidateEmail || ''}`;
      break;

    case 'technical':
      toneLabel = 'Technical & Metric-Driven';
      subject = `${jobTitle} Candidate — Technical Profile: ${candidateName}`;
      body = `Dear ${recipient} at ${company},

I am writing to express my strong interest in the ${jobTitle} opening at ${company}. With ${experienceYears}+ years of technical experience focused on ${topSkillsList}, I specialize in building robust, performant systems and delivering quantifiable technical and business outcomes.

Key highlights of my background include:
• Extensive hands-on proficiency across ${topSkillsList}, enforcing strict architectural standards and best practices.
• Proven capability in optimizing performance metrics, reducing system latency, and eliminating operational bottlenecks.
• Deep commitment to maintainability, test coverage, and seamless cross-functional delivery with engineering and product teams.

I have been impressed by ${company}'s technical standards and modern engineering culture. I am excited by the prospect of applying my expertise in ${skillsSentence} to tackle your most demanding technical challenges and scale your platform reliably.

I look forward to discussing the technical requirements of the role and demonstrating how my background fits your team's needs.

Regards,

${candidateName}
${params.candidatePhone ? `${params.candidatePhone}  •  ` : ''}${params.candidateEmail || ''}`;
      break;
  }

  return { subject, body, toneLabel };
}
