const Confession = require('../models/Confession');
const ReportLog = require('../models/ReportLog');
const crypto = require('crypto');
const dns = require('dns');
const https = require('https');


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

function googleDnsLookup(hostname, options, callback) {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1']);
  resolver.resolve4(hostname, (err4, addrs4) => {
    if (!err4 && addrs4?.length) return callback(null, addrs4[0], 4);
    resolver.resolve6(hostname, (err6, addrs6) => {
      if (!err6 && addrs6?.length) return callback(null, addrs6[0], 6);
      callback(err4 || err6, null, null);
    });
  });
}

function httpsRequest(urlString, body, headers, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const bodyStr = JSON.stringify(body);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      lookup: googleDnsLookup,
      timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function hfRequestWithRetry(urlString, body, headers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await httpsRequest(urlString, body, headers);
      if ((response.status === 429 || response.status === 502 || response.status === 503) && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.1';

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

    const response = await hfRequestWithRetry(
      HF_API_URL,
      {
        model: HF_MODEL,
        messages: [
          {
            role: 'user',
            content: `You are a thoughtful, supportive friend. Read this anonymous confession and provide:
1. Your honest, kind opinion
2. Helpful advice or tips for the person

Keep it concise (2-3 paragraphs). Be understanding and non-judgmental.

Confession: "${confession.text}"`
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      },
      {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    );

    if (response.status !== 200) {
      console.error('Hugging Face API error:', response.status, JSON.stringify(response.body));
      return res.status(502).json({ error: 'AI analysis service temporarily unavailable.' });
    }

    const analysis = response.body?.choices?.[0]?.message?.content?.trim() || 'No analysis generated.';

    res.json({ analysis });
  } catch (err) {
    if (err.message?.includes('timed out')) {
      return res.status(504).json({ error: 'AI analysis timed out. Please try again.' });
    }
    if (err.code === 'ENOTFOUND' || err.message?.includes('getaddrinfo') || err.message?.includes('ENODATA')) {
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
