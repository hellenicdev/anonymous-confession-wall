const Confession = require('../models/Confession');
const ReportLog = require('../models/ReportLog');
const crypto = require('crypto');
const dns = require('dns');

const REPORT_THRESHOLD = 3;

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + 'confession-wall-salt').digest('hex');
}

function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

exports.getConfessions = async (req, res, next) => {
  try {
    const { sort, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    let sortOption = { createdAt: -1 };
    if (sort === 'reactions') {
      sortOption = {
        'reactions.heart': -1,
        'reactions.fire': -1,
        'reactions.skull': -1,
        'reactions.laugh': -1,
        createdAt: -1
      };
    }

    const confessions = await Confession.find({ hidden: false })
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Confession.countDocuments({ hidden: false });

    res.json({
      confessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createConfession = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Confession text is required.' });
    }

    const trimmed = text.trim();
    if (trimmed.length > 1000) {
      return res.status(400).json({ error: 'Confession must be under 1000 characters.' });
    }

    const textHash = hashText(trimmed);
    const ipHash = hashIP(req.ip);

    const existing = await Confession.findOne({ textHash }).lean();
    if (existing) {
      return res.status(409).json({ error: 'This confession has already been submitted.' });
    }

    const confession = await Confession.create({
      text: trimmed,
      ipHash,
      textHash
    });

    res.status(201).json({ message: 'Confession posted.', confession });
  } catch (err) {
    next(err);
  }
};

exports.reactToConfession = async (req, res, next) => {
  try {
    const { type } = req.body;
    const validReactions = ['heart', 'fire', 'skull', 'laugh'];

    if (!validReactions.includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type.' });
    }

    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    if (confession.hidden) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    confession.reactions[type] += 1;
    await confession.save();

    res.json({ message: 'Reaction added.', reactions: confession.reactions });
  } catch (err) {
    next(err);
  }
};

exports.reportConfession = async (req, res, next) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession || confession.hidden) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    const ipHash = hashIP(req.ip);

    const alreadyReported = await ReportLog.findOne({
      confessionId: confession._id,
      ipHash
    });
    if (alreadyReported) {
      return res.status(409).json({ error: 'You have already reported this confession.' });
    }

    await ReportLog.create({
      confessionId: confession._id,
      ipHash
    });

    confession.reports += 1;

    if (confession.reports >= REPORT_THRESHOLD) {
      confession.hidden = true;
    }

    await confession.save();

    res.json({
      message: confession.hidden
        ? 'Confession has been hidden due to multiple reports.'
        : 'Report submitted.',
      reports: confession.reports,
      hidden: confession.hidden
    });
  } catch (err) {
    next(err);
  }
};

async function resolveHostname(hostname) {
  try {
    return await dns.promises.resolve4(hostname);
  } catch {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    return await resolver.resolve4(hostname);
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await resolveHostname(new URL(url).hostname);
    } catch {
      if (i === retries - 1) throw new Error('DNS resolution failed');
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      continue;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000)
      });
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

exports.analyzeConfession = async (req, res, next) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession || confession.hidden) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI analysis is not configured.' });
    }

    const prompt = `<s>[INST] You are a thoughtful, supportive friend. Read this anonymous confession and provide:
1. Your honest, kind opinion
2. Helpful advice or tips for the person

Keep it concise (2-3 paragraphs). Be understanding and non-judgmental.

Confession: "${confession.text}" [/INST]`;

    const response = await fetchWithRetry(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 400,
            temperature: 0.7,
            return_full_text: false
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', response.status, errorText);
      return res.status(502).json({ error: 'AI analysis service temporarily unavailable.' });
    }

    const result = await response.json();
    const analysis = result[0]?.generated_text?.trim() || 'No analysis generated.';

    res.json({ analysis });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      return res.status(504).json({ error: 'AI analysis timed out. Please try again.' });
    }
    if (err.message?.includes('DNS')) {
      return res.status(503).json({ error: 'AI analysis service unreachable. Try again later.' });
    }
    next(err);
  }
};

exports.getTrending = async (req, res, next) => {
  try {
    const confessions = await Confession.find({ hidden: false })
      .sort({
        'reactions.heart': -1,
        'reactions.fire': -1,
        'reactions.skull': -1,
        'reactions.laugh': -1,
        createdAt: -1
      })
      .limit(10)
      .lean();

    const enriched = confessions.map(c => ({
      ...c,
      totalReactions: c.reactions.heart + c.reactions.fire + c.reactions.skull + c.reactions.laugh
    }));

    enriched.sort((a, b) => b.totalReactions - a.totalReactions);

    res.json({ confessions: enriched.slice(0, 10) });
  } catch (err) {
    next(err);
  }
};

exports.getDailyTrending = async (req, res, next) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const confessions = await Confession.find({
      hidden: false,
      createdAt: { $gte: oneDayAgo }
    })
      .sort({
        'reactions.heart': -1,
        'reactions.fire': -1,
        'reactions.skull': -1,
        'reactions.laugh': -1
      })
      .limit(5)
      .lean();

    const enriched = confessions.map(c => ({
      ...c,
      totalReactions: c.reactions.heart + c.reactions.fire + c.reactions.skull + c.reactions.laugh
    }));

    enriched.sort((a, b) => b.totalReactions - a.totalReactions);

    res.json({ confessions: enriched });
  } catch (err) {
    next(err);
  }
};
