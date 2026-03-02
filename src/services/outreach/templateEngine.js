const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateSequence(lead, campaign) {
  const emails = [];
  for (let step = 1; step <= 4; step++) {
    const email = await generateEmail(lead, campaign, step);
    emails.push({ step, ...email });
  }
  return emails;
}

async function generateEmail(lead, campaign, step) {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key') {
    try { return await generateWithAI(lead, step); } catch (e) {
      console.error('[EmailGen] AI failed, using template:', e.message);
    }
  }
  return generateFromTemplate(lead, step);
}

async function generateWithAI(lead, step) {
  const hasWebsite = lead.website_status !== 'none' && (lead.website_url || lead.maps_website);
  const angle = {
    1: hasWebsite
      ? 'Noticed their website could be improved — gentle opener, mention one specific thing that could be better, soft CTA (15-min call)'
      : 'They have no website and great reviews — they are losing online customers every day, one soft CTA',
    2: hasWebsite
      ? 'Follow up — share a specific stat about how a modern website affects conversion for their business type'
      : 'Follow up — competitor comparison: their rival has a website and is getting leads they are missing',
    3: 'Social proof — brief story of a similar local business that got a website and saw real results, with numbers',
    4: 'Break-up email — low pressure, offer a FREE website concept/mockup as a parting gift, make it feel like a gift not a pitch',
  }[step];

  const reviews = [];
  try {
    const raw = typeof lead.source_reviews === 'string' ? JSON.parse(lead.source_reviews) : (lead.source_reviews || []);
    reviews.push(...raw.slice(0, 3).map(r => r.text).filter(Boolean));
  } catch {}

  const senderName = process.env.SENDER_NAME || 'Alex';
  const agencyName = process.env.AGENCY_NAME || 'our agency';

  const prompt = `You are writing cold outreach emails for a web design agency. Write email step ${step} of 4.

BUSINESS:
- Name: ${lead.business_name}
- Type: ${lead.category || 'local business'}
- Location: ${lead.city || ''}${lead.state ? ', ' + lead.state : ''}
- Rating: ${lead.rating || 'N/A'} ⭐ with ${lead.review_count || 0} reviews
- Website: ${hasWebsite ? 'Has website — ' + (lead.website_url || lead.maps_website) : 'NO website'}
- Greeting: ${lead.owner_name ? 'Hi ' + lead.owner_name.split(' ')[0] : 'Hi there'}

RECENT REVIEWS (use for personalisation):
${reviews.length ? reviews.map(r => '- "' + r.slice(0, 200) + '"').join('\n') : 'Not available'}

THIS EMAIL ANGLE: ${angle}
SENDER NAME: ${senderName}

RULES:
- Max 120 words body
- Conversational, NOT corporate/salesy
- Reference something real from their reviews or business
- ONE clear CTA only
- No "I hope this email finds you well" or similar filler
- End with: ${senderName}
- Subject max 7 words, no all-caps, no spam trigger words

Return ONLY valid JSON, no markdown:
{"subject":"...","body":"..."}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text.replace(/```json?/gi, '').replace(/```/g, '').trim();
  const data = JSON.parse(text);
  return { subject: data.subject, body: data.body };
}

function generateFromTemplate(lead, step) {
  const hasWebsite = lead.website_status !== 'none' && (lead.website_url || lead.maps_website);
  const name = lead.business_name;
  const city = lead.city || 'your area';
  const greeting = lead.owner_name ? `Hi ${lead.owner_name.split(' ')[0]}` : 'Hi there';
  const sender = process.env.SENDER_NAME || 'Alex';

  const templates = {
    1: {
      subject: hasWebsite ? `Quick thought on ${name}'s website` : `${name} is missing online leads`,
      body: hasWebsite
        ? `${greeting},\n\nI came across ${name} while researching ${city} businesses and noticed your website could be doing a lot more for you.\n\nWith ${lead.review_count || 'your'} reviews and a ${lead.rating || 'strong'} rating, you clearly deliver great service — but your online presence isn't reflecting that.\n\nWould you be open to a quick 15-min call to see what's possible?\n\n${sender}`
        : `${greeting},\n\nI found ${name} on Google Maps — ${lead.review_count || 'many'} reviews and ${lead.rating || 'great'} stars. Impressive!\n\nBut you don't have a website, which means every customer searching online is going to your competitors instead.\n\nI'd love to show you what a simple website could do for your business. Up for a quick chat?\n\n${sender}`,
    },
    2: {
      subject: `Following up — ${name}`,
      body: `${greeting},\n\nJust following up on my last message.\n\nBusinesses in ${city} with professional websites typically see 30-40% more enquiries than those without. For a business with your reputation, that's a lot of opportunity.\n\nI can put together a free concept for you — no commitment, just so you can see what's possible.\n\nWorth a look?\n\n${sender}`,
    },
    3: {
      subject: `What happened to a similar business in ${city}`,
      body: `${greeting},\n\nA ${lead.category || 'local business'} we worked with had similar reviews to yours. Within 3 months of launching their website, they added 12 new monthly clients purely from online searches.\n\nNot magic — just being visible where customers are already looking.\n\nI think we could do the same for ${name}. Would you be open to seeing a quick mockup?\n\n${sender}`,
    },
    4: {
      subject: `Last note — free mockup for ${name}`,
      body: `${greeting},\n\nI know you're busy — this is my last note.\n\nAs a parting gesture, I'd like to build you a FREE website concept for ${name}. No pitch, no obligation — just something concrete you can keep and use however you like.\n\nIf you ever decide to move forward, great. If not, it's still yours.\n\nJust say the word.\n\n${sender}`,
    },
  };

  return templates[step] || templates[1];
}

module.exports = { generateSequence, generateEmail };
