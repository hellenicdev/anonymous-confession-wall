const Confession = require('../models/Confession');
const ReportLog = require('../models/ReportLog');

function logAccess(req, detail) {
  const keyPrefix = (process.env.ADMIN_API_KEY || '').slice(0, 8);
  console.log(`[ADMIN] ${req.method} ${req.originalUrl} — ${detail} — key ${keyPrefix}**** at ${new Date().toISOString()}`);
}

exports.getConfession = async (req, res, next) => {
  try {
    const confession = await Confession.findById(req.params.id)
      .select('+ipHash +rawIp +userAgent +textHash')
      .lean();
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    logAccess(req, `confession ${confession._id}`);
    res.json({ confession });
  } catch (err) {
    next(err);
  }
};

exports.searchConfessions = async (req, res, next) => {
  try {
    const { ip, dateFrom, dateTo, text, hidden, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const filter = {};

    if (ip) {
      filter.rawIp = ip;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (text) {
      filter.text = { $regex: text, $options: 'i' };
    }

    if (hidden !== undefined) {
      filter.hidden = hidden === 'true';
    }

    const confessions = await Confession.find(filter)
      .select('+rawIp +userAgent')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Confession.countDocuments(filter);

    logAccess(req, `search (${JSON.stringify(filter)}) — ${total} results`);

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

exports.getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const reports = await ReportLog.find()
      .select('+rawIp +userAgent')
      .populate({
        path: 'confessionId',
        select: 'text createdAt rawIp hidden reactions reports',
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await ReportLog.countDocuments();

    logAccess(req, `reports list — ${total} total`);

    res.json({
      reports,
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

exports.getConfessionReports = async (req, res, next) => {
  try {
    const confession = await Confession.findById(req.params.confessionId)
      .select('+rawIp')
      .lean();
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    const reports = await ReportLog.find({ confessionId: req.params.confessionId })
      .select('+rawIp +userAgent')
      .sort({ createdAt: -1 })
      .lean();

    logAccess(req, `reports for confession ${req.params.confessionId} — ${reports.length} reports`);

    res.json({
      confession: {
        _id: confession._id,
        text: confession.text,
        createdAt: confession.createdAt,
        rawIp: confession.rawIp,
        hidden: confession.hidden
      },
      reports
    });
  } catch (err) {
    next(err);
  }
};

exports.getReportStats = async (req, res, next) => {
  try {
    const totalReports = await ReportLog.countDocuments();
    const totalConfessions = await Confession.countDocuments();
    const hiddenConfessions = await Confession.countDocuments({ hidden: true });

    const reportsPerDay = await ReportLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    const mostReported = await Confession.find({ reports: { $gt: 0 } })
      .select('text createdAt reports hidden')
      .sort({ reports: -1 })
      .limit(10)
      .lean();

    logAccess(req, 'report stats');

    res.json({
      summary: {
        totalReports,
        totalConfessions,
        hiddenConfessions,
        reportRate: totalConfessions > 0 ? ((totalReports / totalConfessions) * 100).toFixed(2) + '%' : '0%'
      },
      reportsPerDay,
      mostReported
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleHide = async (req, res, next) => {
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    confession.hidden = !confession.hidden;
    await confession.save();

    logAccess(req, `toggled hide ${confession._id} → hidden=${confession.hidden}`);

    res.json({
      message: `Confession is now ${confession.hidden ? 'hidden' : 'visible'}.`,
      _id: confession._id,
      hidden: confession.hidden
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteConfession = async (req, res, next) => {
  try {
    const confession = await Confession.findByIdAndDelete(req.params.id);
    if (!confession) {
      return res.status(404).json({ error: 'Confession not found.' });
    }

    await ReportLog.deleteMany({ confessionId: req.params.id });

    logAccess(req, `deleted confession ${req.params.id} and associated reports`);

    res.json({ message: 'Confession permanently deleted.' });
  } catch (err) {
    next(err);
  }
};
