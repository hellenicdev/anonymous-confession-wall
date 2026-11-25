const Confession = require('../models/Confession');
const ReportLog = require('../models/ReportLog');
const crypto = require('crypto');

const mongoose = require('mongoose');

const REPORT_THRESHOLD = 3;
const IP_HASH_SALT = process.env.IP_HASH_SALT || 'confession-wall-salt';
const VALID_REACTIONS = ['heart', 'fire', 'skull', 'laugh'];

function hashIP(ip) {
  return crypto.createHash('sha256').update(String(ip) + IP_HASH_SALT).digest('hex');
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function publicConfession(c) {
  return {
    _id: c._id,
    text: c.text,
    createdAt: c.createdAt,
    reactions: c.reactions,
    totalReactions: c.totalReactions
  };
}

// Rank by total reactions (the old multi-key sort ranked by hearts first,
// so a post with 1 heart beat one with 50 fires).
async function rankedByReactions(match, limit) {
  const docs = await Confession.aggregate([
    { $match: match },
    { $addFields: { totalReactions: { $add: ['$reactions.heart', '$reactions.fire', '$reactions.skull', '$reactions.laugh'] } } },
    { $sort: { totalReactions: -1, createdAt: -1 } },
    { $limit: limit }
  ]);
  return docs.map(publicConfession);
}

function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

exports.getConfessions = async (req, res, next) => {
  try {
    const { sort, page = 1, limit = 10 } = req.query;
    const pageNum = Math.min(1000, Math.max(1, toInt(page, 1)));
    const limitNum = Math.min(50, Math.max(1, toInt(limit, 10)));

    const pipeline = [{ $match: { hidden: false } }];
    if (sort === 'reactions') {
      pipeline.push(
        { $addFields: { totalReactions: { $add: ['$reactions.heart', '$reactions.fire', '$reactions.skull', '$reactions.laugh'] } } },
        { $sort: { totalReactions: -1, createdAt: -1 } }
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }
    pipeline.push({ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum });

    const confessions = (await Confession.aggregate(pipeline)).map(publicConfession);

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

    if (typeof text !== 'string' || text.trim().length === 0) {
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

    res.status(201).json({ message: 'Confession posted.', confession: publicConfession(confession) });
  } catch (err) {
    next(err);
  }
};

exports.reactToConfession = async (req, res, next) => {
  try {
    const type = req.body && req.body.type;

    if (!VALID_REACTIONS.includes(type)) {
      return res.status(400).json({ error: 'Invalid reaction type.' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }

    // Atomic increment: concurrent reactions no longer overwrite each other.
    const confession = await Confession.findOneAndUpdate(
      { _id: req.params.id, hidden: false },
      { $inc: { [`reactions.${type}`]: 1 } },
      { new: true, projection: { reactions: 1 } }
    ).lean();
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    res.json({ message: 'Reaction added.', reactions: confession.reactions });
  } catch (err) {
    next(err);
  }
};

exports.reportConfession = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid ID format.' });
    }
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

    const updated = await Confession.findByIdAndUpdate(
      confession._id,
      { $inc: { reports: 1 } },
      { new: true, projection: { reports: 1, hidden: 1 } }
    );
    if (updated.reports >= REPORT_THRESHOLD && !updated.hidden) {
      updated.hidden = true;
      await updated.save();
    }

    res.json({
      message: updated.hidden
        ? 'Confession has been hidden due to multiple reports.'
        : 'Report submitted.',
      reports: updated.reports,
      hidden: updated.hidden
    });
  } catch (err) {
    next(err);
  }
};

exports.getTrending = async (req, res, next) => {
  try {
    res.json({ confessions: await rankedByReactions({ hidden: false }, 10) });
  } catch (err) {
    next(err);
  }
};

exports.getDailyTrending = async (req, res, next) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    res.json({ confessions: await rankedByReactions({ hidden: false, createdAt: { $gte: oneDayAgo } }, 5) });
  } catch (err) {
    next(err);
  }
};
