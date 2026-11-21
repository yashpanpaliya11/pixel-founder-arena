const lines = {
  syntax: {
    en: ['The roadmap has ten milestones. Closing that bracket is milestone one.', 'A missing bracket just became your biggest competitor.', 'Your pitch has a closing slide. Your function deserves one too.'],
    hinglish: ['Mars baad mein jaana, pehle bracket band kar bhai.', 'Startup stealth mode mein tha. Ab closing bracket bhi hai.', 'Pitch toh close kar li, parenthesis kaun close karega?'],
  },
  reference: {
    en: ['That variable is so stealth nobody knows it exists.', 'You cannot scale a variable you never declared.', 'Your variable has a pitch deck, but no definition.'],
    hinglish: ['Variable bhi stealth startup hai: kisi ko pata hi nahi exist karta hai.', 'Funding se pehle variable declare kar le bhai.', 'Naam bada hai, declaration gayab hai.'],
  },
  type: {
    en: ['Undefined is not a business model. Or an object.', 'That function call has confidence. The value does not.', 'Your data pivoted. Your code did not get the memo.'],
    hinglish: ['Undefined ko CEO bana diya kya?', 'Function bulaya tha, variable interview dene aa gaya.', 'Data ne pivot kar liya, code abhi purane startup mein hai.'],
  },
  module: {
    en: ['Your dependency is working remotely. Very remotely.', 'The import has ambition. The file path needs directions.', 'Even your modules are waiting for an introduction.'],
    hinglish: ['Dependency remote work pe hai. Mil hi nahi rahi.', 'Import toh kar diya, package ko invite bheja tha?', 'File ka address galat hai, delivery kaise hogi bhai?'],
  },
  test: {
    en: ['The demo believed you. The assertion asked for evidence.', 'Product-market fit is pending. Expected-actual fit is also pending.', 'A red test is feedback with excellent timing.'],
    hinglish: ['Demo mein chal raha tha? Test ko bhi demo dikha de.', 'Expected aur actual ka breakup ho gaya.', 'Test ne pitch nahi, proof maanga hai bhai.'],
  },
  range: {
    en: ['Your recursion has ambition and absolutely no exit strategy.', 'Infinite growth is a pitch. Infinite recursion is a crash.', 'That stack needs a base case, not another funding round.'],
    hinglish: ['Recursion ko exit strategy bhi de de bhai.', 'Infinite growth theek hai, infinite recursion nahi.', 'Call stack ko funding nahi, base case chahiye.'],
  },
  generic: {
    en: ['The command has feedback. Your next move is to read it.', 'A small debugging detour on the road to your big launch.', 'Shipping fast includes reading the error message.'],
    hinglish: ['Run button dabane se code khud repair nahi hota bhai.', 'Error ne feedback diya hai, pehle padh toh le.', 'Launch ruk sakta hai, debugging nahi.'],
  },
};
const personal = {
  elon: { en: 'The rocket can wait.', hinglish: 'Rocket ruk jayega.' },
  jensen: { en: 'More GPUs will not fix this.', hinglish: 'GPU badhane se ye fix nahi hoga.' },
  jobs: { en: 'One more thing: make it work.', hinglish: 'One more thing: pehle chala toh le.' },
  levels: { en: 'MRR is still waiting.', hinglish: 'MRR abhi bhi wait kar raha hai.' },
  zuck: { en: 'Let us get this running before we scale it.', hinglish: 'Scale karne se pehle chala le.' },
};

export function chooseRoast({ founder, category = 'generic', language = 'en', intensity = 'funny', previous = '', random = Math.random }) {
  const lang = language === 'hinglish' ? 'hinglish' : 'en';
  if (intensity === 'chill') return lang === 'en' ? 'Small bug, useful lesson. You have got this.' : 'Chhota sa bug hai bhai. Ho jayega.';
  let pool = founder?.roasts?.[lang]?.length ? founder.roasts[lang] : (lines[category] ?? lines.generic)[lang];
  const signature = personal[founder?.id]?.[lang];
  pool = pool.map(line => {
    if (intensity === 'savage') line += lang === 'en' ? ' Your keyboard has requested a strategy meeting.' : ' Keyboard ne strategy meeting bula li hai.';
    return signature ? `${line} ${signature}` : line;
  });
  if (pool.length > 1) pool = pool.filter(line => line !== previous);
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}

export const topics = ['MRR', 'Marketing', 'Bootstrapping', 'Competitors', 'Product', 'AI'];
const argumentsByTopic = {
  MRR: ['Which customer would pay for this today?', 'Recurring revenue needs recurring value. What brings people back?', 'Try a small paid pilot before adding another feature.'],
  Marketing: ['Where do your first ten users already spend time?', 'Make one clear promise and show a real demo.', 'Test one distribution channel and measure qualified signups.'],
  Bootstrapping: ['What can you launch without hiring or raising money?', 'Keep costs low enough that a small customer base can sustain you.', 'Reduce the first release to one useful outcome.'],
  Competitors: ['What specific customer is underserved by the alternatives?', 'A long feature list is easy to copy. A clear use case is more useful.', 'Ask five target users what they currently use and what frustrates them.'],
  Product: ['What is the smallest complete task your product helps someone finish?', 'Remove a step from the first-use experience.', 'Watch someone try the product before explaining it to them.'],
  AI: ['Does this task need generated output, or would a simple rule work?', 'Plan for wrong answers, latency, and inference cost.', 'Evaluate a small set of real tasks before making quality claims.'],
};
const stance = {
  rocket: 'I want an ambitious outcome, but a working first step.', gpu: 'Measure the bottleneck before buying more compute.',
  growth: 'Distribution matters; make sharing genuinely useful.', customer: 'Start with the customer and work backward.',
  design: 'Simplify the experience until the value is obvious.', revenue: 'I want paying customers before unnecessary complexity.',
  sales: 'Who approves the purchase, and what problem do they budget for?', reliability: 'A good demo also needs reliable behavior.',
  evidence: 'Show the evidence behind that assumption.', payments: 'Make the first successful payment easy.',
};
const debateRoasts = {
  MRR: {
    en: ['your revenue forecast has more imagination than your product demo.', 'you keep saying scale. The first paying customer is still on the waiting list.', 'your pitch deck has recurring slides. Try recurring revenue next.'],
    hinglish: ['tera revenue forecast toh product demo se bhi zyada imaginary hai.', 'scale scale bol raha hai, pehla paying customer abhi bhi wait kar raha hai.', 'pitch deck ki slides recurring hain. Ab revenue bhi recurring kar le.'],
  },
  Marketing: {
    en: ['your launch announcement has more founders in the replies than customers.', 'another mysterious teaser? Even the landing page wants to know what you sell.', 'your entire distribution strategy is hoping someone famous reposts it.'],
    hinglish: ['tere launch pe customers kam, founders ke congrats zyada hain.', 'phir teaser? Landing page bhi pooch raha hai ki bech kya raha hai.', 'teri marketing strategy bas kisi famous bande ke repost ka wait kar rahi hai.'],
  },
  Bootstrapping: {
    en: ['your infrastructure budget has already outgrown your business idea.', 'you hired a boardroom before you found a customer.', 'you have a fundraising strategy for a feature that needs one afternoon.'],
    hinglish: ['idea chhota hai, infrastructure ka bill unicorn wala hai.', 'customer mila nahi, boardroom pehle hire kar liya.', 'ek afternoon ke feature ke liye funding round plan kar raha hai.'],
  },
  Competitors: {
    en: ['your competitive moat is a different shade of blue.', 'you studied every competitor except the customer doing the actual work.', 'your product differentiation is mostly the font on the homepage.'],
    hinglish: ['tera competitive moat bas blue ka doosra shade hai.', 'har competitor ko study kiya, customer ko kab study karega?', 'product ka difference bas homepage ka font hai bhai.'],
  },
  Product: {
    en: ['your settings page is longer than the problem statement.', 'you added six features to avoid fixing the first one.', 'your onboarding needs its own onboarding.'],
    hinglish: ['teri settings page problem statement se bhi lambi hai.', 'pehla feature fix karne ke bajaye chhe naye add kar diye.', 'tere onboarding ko khud onboarding chahiye.'],
  },
  AI: {
    en: ['your tiny to-do list has a GPU budget now. Remarkable.', 'you added an agent to a problem that needed an if statement.', 'your demo says intelligent. Your retry button says otherwise.'],
    hinglish: ['chhoti si to-do list ka bhi GPU budget bana diya. Wah.', 'if statement wale kaam ke liye agent hire kar liya.', 'demo intelligent bolta hai, retry button kuch aur bol raha hai.'],
  },
};
const targetJabs = {
  rocket: { en: 'Put the rocket roadmap down for a minute.', hinglish: 'Rocket ka roadmap ek minute side mein rakh.' },
  gpu: { en: 'And no, another GPU is not the answer.', hinglish: 'Aur haan, ek aur GPU iska answer nahi hai.' },
  growth: { en: 'A billion imaginary users still count as zero.', hinglish: 'Ek billion imaginary users ka count abhi bhi zero hai.' },
  design: { en: 'The presentation can wait one more slide.', hinglish: 'Presentation ki ek aur slide ruk sakti hai.' },
  revenue: { en: 'Let the MRR spreadsheet breathe for a second.', hinglish: 'MRR spreadsheet ko ek second saans lene de.' },
  ai: { en: 'Not every meeting needs a model upgrade.', hinglish: 'Har meeting ko model upgrade nahi chahiye.' },
};
export function createDebate({ topic = 'MRR', project = {}, cast = [], language = 'en', intensity = 'funny', random = Math.random }) {
  if (!topics.includes(topic)) throw new Error('Choose a supported debate topic.');
  if (cast.length < 2) throw new Error('Choose at least two characters for a debate.');
  const name = String(project.name || 'your project').slice(0, 80);
  const audience = String(project.audience || 'your target users').slice(0, 160);
  const description = String(project.description || '').slice(0, 500);
  const prompts = argumentsByTopic[topic];
  const start = Math.min(cast.length - 1, Math.max(0, Math.floor(random() * cast.length)));
  const speakers = [cast[start], cast[(start + 1) % cast.length], cast[(start + 2) % cast.length]];
  const lang = language === 'hinglish' ? 'hinglish' : 'en';
  const pool = debateRoasts[topic][lang];
  const variant = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return {
    topic, project: name,
    lines: speakers.map((f, i) => {
      const target = speakers[i === 1 ? 0 : 1];
      const targetName = target.name.split(' ')[0];
      let roast = intensity === 'chill'
        ? (lang === 'en' ? `${targetName}, big pitch. Let us try one small experiment first.` : `${targetName}, pitch badiya hai bhai. Pehle ek chhota experiment toh kar le.`)
        : `${targetName}, ${pool[(variant + i) % pool.length]}`;
      if (intensity === 'funny' && targetJabs[target.archetype]) roast += ` ${targetJabs[target.archetype][lang]}`;
      if (intensity === 'savage') roast += lang === 'en' ? ' Even your pitch deck just asked for a refund.' : ' Teri pitch deck ne bhi refund maang liya.';
      return {
        founderId: f.id, targetId: target.id, roast,
        text: i === 0 ? `For ${name}, aimed at ${audience}: ${prompts[0]}` : i === 1 ? `${stance[f.archetype] ?? 'A useful feature needs a clear reason to exist.'} ${prompts[1]}` : `My challenge: ${prompts[2]}${description ? ' Check whether that validates the problem in your project brief.' : ''}`,
      };
    }),
    takeaway: prompts[2],
    note: 'Scripted fictional role-play, not statements or advice from the real people.',
  };
}
