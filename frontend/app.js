const API_BASE = 'https://anonymous-confession-wall-fdqx.onrender.com/api';

let currentSort = 'newest';
let currentFilter = 'all';
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let reportTargetId = null;

const elements = {
  form: document.getElementById('confessionForm'),
  input: document.getElementById('confessionInput'),
  submitBtn: document.getElementById('submitBtn'),
  feed: document.getElementById('feed'),
  feedTitle: document.getElementById('feedTitle'),
  charCount: document.getElementById('charCount'),
  loadingSkeleton: document.getElementById('loadingSkeleton'),
  emptyState: document.getElementById('emptyState'),
  scrollSentinel: document.getElementById('scrollSentinel'),
  toastContainer: document.getElementById('toastContainer'),
  themeToggle: document.getElementById('themeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  sortNewest: document.getElementById('sortNewest'),
  sortReactions: document.getElementById('sortReactions'),
  showTrending: document.getElementById('showTrending'),
  reportModal: document.getElementById('reportModal'),
  cancelReport: document.getElementById('cancelReport'),
  confirmReport: document.getElementById('confirmReport'),
  feedFooter: document.getElementById('feedFooter')
};

function getApiUrl(endpoint) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:5000/api${endpoint}`;
  }
  return `${API_BASE}${endpoint}`;
}

async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createConfessionCard(confession) {
  const card = document.createElement('div');
  card.className = 'confession-card glass';
  card.dataset.id = confession._id;
  card.style.animationDelay = '0s';

  const totalReactions = confession.reactions.heart + confession.reactions.fire + confession.reactions.skull + confession.reactions.laugh;

  card.innerHTML = `
    <p class="confession-text">${escapeHtml(confession.text)}</p>
    <div class="confession-meta">
      <span class="confession-time">${timeAgo(confession.createdAt)}</span>
      <span class="confession-time">${totalReactions} reactions</span>
    </div>
    <div class="confession-actions">
      <button class="reaction-btn" data-type="heart" aria-label="React with heart">
        <span class="emoji">❤️</span>
        <span class="count">${confession.reactions.heart}</span>
      </button>
      <button class="reaction-btn" data-type="fire" aria-label="React with fire">
        <span class="emoji">🔥</span>
        <span class="count">${confession.reactions.fire}</span>
      </button>
      <button class="reaction-btn" data-type="skull" aria-label="React with skull">
        <span class="emoji">💀</span>
        <span class="count">${confession.reactions.skull}</span>
      </button>
      <button class="reaction-btn" data-type="laugh" aria-label="React with laugh">
        <span class="emoji">😂</span>
        <span class="count">${confession.reactions.laugh}</span>
      </button>
    </div>
    <div class="confession-card-footer">
      <button class="ai-btn" data-id="${confession._id}" aria-label="Get AI insight">
        <span class="ai-btn-icon">🤖</span>
        <span class="ai-btn-text">AI Insight</span>
        <span class="ai-btn-loader" hidden></span>
      </button>
      <button class="report-btn" data-id="${confession._id}" aria-label="Report this confession">
        ⚑ Report
      </button>
    </div>
    <div class="ai-analysis" hidden>
      <div class="ai-analysis-content"></div>
    </div>
  `;

  const aiBtn = card.querySelector('.ai-btn');
  const aiBox = card.querySelector('.ai-analysis');
  const aiContent = aiBox.querySelector('.ai-analysis-content');

  aiBtn.addEventListener('click', async () => {
    if (aiBtn.classList.contains('loading')) return;

    if (!aiBox.hidden) {
      aiBox.hidden = true;
      return;
    }

    if (aiContent.dataset.cached) {
      aiBox.hidden = false;
      return;
    }

    aiBtn.classList.add('loading');
    aiBtn.querySelector('.ai-btn-text').hidden = true;
    aiBtn.querySelector('.ai-btn-loader').hidden = false;

    try {
      const data = await apiFetch(`/confessions/${confession._id}/analyze`, { method: 'POST' });
      aiContent.textContent = data.analysis;
      aiContent.dataset.cached = 'true';
      aiBox.hidden = false;
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      aiBtn.classList.remove('loading');
      aiBtn.querySelector('.ai-btn-text').hidden = false;
      aiBtn.querySelector('.ai-btn-loader').hidden = true;
    }
  });

  card.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      const countSpan = btn.querySelector('.count');
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');

      try {
        await apiFetch(`/confessions/${confession._id}/react`, {
          method: 'POST',
          body: JSON.stringify({ type })
        });
      } catch (err) {
        countSpan.textContent = parseInt(countSpan.textContent) - 1;
        showToast(err.message, 'error');
      }
    });
  });

  card.querySelector('.report-btn').addEventListener('click', () => {
    reportTargetId = confession._id;
    elements.reportModal.classList.add('open');
  });

  return card;
}

async function loadConfessions(append = false) {
  if (isLoading || !hasMore) return;
  isLoading = true;

  if (!append) {
    elements.loadingSkeleton.hidden = false;
    elements.emptyState.hidden = true;
    elements.feed.innerHTML = '';
  } else {
    const spinner = document.createElement('p');
    spinner.className = 'loading-more';
    spinner.textContent = 'Loading more...';
    elements.feedFooter.appendChild(spinner);
  }

  try {
    let data;
    let endpoint = `/confessions?sort=${currentSort}&page=${currentPage}&limit=10`;

    if (currentFilter === 'trending') {
      data = await apiFetch('/trending');
    } else if (currentFilter === 'daily') {
      data = await apiFetch('/confessions/daily-trending');
    } else {
      data = await apiFetch(endpoint);
    }

    const confessions = data.confessions || [];

    if (!append) {
      elements.feed.innerHTML = '';
    }

    if (confessions.length === 0 && !append) {
      elements.emptyState.hidden = false;
      elements.feedTitle.textContent = currentFilter === 'trending' ? 'Trending Confessions' : 'Latest Confessions';
      hasMore = false;
      isLoading = false;
      elements.loadingSkeleton.hidden = true;
      elements.feedFooter.innerHTML = '';
      return;
    }

    confessions.forEach(c => {
      elements.feed.appendChild(createConfessionCard(c));
    });

    if (data.pagination) {
      hasMore = currentPage < data.pagination.pages;
    } else {
      hasMore = false;
    }

    if (currentFilter === 'trending') {
      elements.feedTitle.textContent = '🔥 Trending Confessions';
      hasMore = false;
    } else if (currentSort === 'newest') {
      elements.feedTitle.textContent = '📝 Latest Confessions';
    } else {
      elements.feedTitle.textContent = '🔥 Most Reacted';
    }

    elements.loadingSkeleton.hidden = true;
    elements.feedFooter.innerHTML = '<div class="infinite-scroll-sentinel" id="scrollSentinel"></div>';

    if (!hasMore && confessions.length > 0) {
      const end = document.createElement('p');
      end.className = 'loading-more';
      end.textContent = 'You\'ve reached the end.';
      elements.feedFooter.appendChild(end);
    }

    isLoading = false;
    observeSentinel();
  } catch (err) {
    showToast(err.message, 'error');
    elements.loadingSkeleton.hidden = true;
    elements.feedFooter.innerHTML = '';
    isLoading = false;
    if (!append && elements.feed.children.length === 0) {
      elements.emptyState.hidden = false;
    }
  }
}

function observeSentinel() {
  const sentinel = document.getElementById('scrollSentinel');
  if (!sentinel) return;

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !isLoading && currentFilter !== 'trending') {
      currentPage++;
      loadConfessions(true);
    }
  }, { rootMargin: '200px' });

  observer.observe(sentinel);
}

function resetFeed() {
  currentPage = 1;
  hasMore = true;
  isLoading = false;
  loadConfessions(false);
}

elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = elements.input.value.trim();
  if (!text) return;

  elements.submitBtn.disabled = true;
  elements.submitBtn.querySelector('.btn-text').hidden = true;
  elements.submitBtn.querySelector('.btn-loader').hidden = false;

  const turnstileToken = typeof turnstile !== 'undefined' ? turnstile.getResponse() : '';
  if (!turnstileToken && typeof turnstile !== 'undefined') {
    showToast('Please complete the security check.', 'error');
    elements.submitBtn.disabled = false;
    elements.submitBtn.querySelector('.btn-text').hidden = false;
    elements.submitBtn.querySelector('.btn-loader').hidden = true;
    return;
  }

  try {
    await apiFetch('/confessions', {
      method: 'POST',
      body: JSON.stringify({ text, turnstileToken })
    });
    elements.input.value = '';
    elements.charCount.textContent = '0';
    if (typeof turnstile !== 'undefined') turnstile.reset();
    showToast('Confession posted anonymously!', 'success');
    resetFeed();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.submitBtn.disabled = false;
    elements.submitBtn.querySelector('.btn-text').hidden = false;
    elements.submitBtn.querySelector('.btn-loader').hidden = true;
  }
});

elements.input.addEventListener('input', () => {
  const len = elements.input.value.length;
  elements.charCount.textContent = len;
  const countEl = elements.charCount;
  countEl.classList.remove('warning', 'danger');
  if (len > 900) countEl.classList.add('danger');
  else if (len > 750) countEl.classList.add('warning');
});

elements.sortNewest.addEventListener('click', () => {
  currentSort = 'newest';
  currentFilter = 'all';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  elements.sortNewest.classList.add('active');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  resetFeed();
});

elements.sortReactions.addEventListener('click', () => {
  currentSort = 'reactions';
  currentFilter = 'all';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  elements.sortReactions.classList.add('active');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  resetFeed();
});

elements.showTrending.addEventListener('click', () => {
  currentFilter = 'trending';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  elements.showTrending.classList.add('active');
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-filter="trending"]').classList.add('active');
  resetFeed();
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (currentFilter === 'trending') {
      elements.showTrending.classList.add('active');
    } else {
      elements.sortNewest.classList.add('active');
      currentSort = 'newest';
    }
    resetFeed();
  });
});

elements.cancelReport.addEventListener('click', () => {
  elements.reportModal.classList.remove('open');
  reportTargetId = null;
});

elements.confirmReport.addEventListener('click', async () => {
  if (!reportTargetId) return;
  try {
    const data = await apiFetch(`/confessions/${reportTargetId}/report`, { method: 'POST' });
    showToast(data.message, 'success');
    if (data.hidden) {
      const card = document.querySelector(`.confession-card[data-id="${reportTargetId}"]`);
      if (card) card.remove();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    elements.reportModal.classList.remove('open');
    reportTargetId = null;
  }
});

elements.reportModal.addEventListener('click', (e) => {
  if (e.target === elements.reportModal) {
    elements.reportModal.classList.remove('open');
    reportTargetId = null;
  }
});

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    elements.themeIcon.textContent = saved === 'dark' ? '🌙' : '☀️';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    elements.themeIcon.textContent = '🌙';
  }
}

elements.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  elements.themeIcon.textContent = next === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('theme', next);
});

initTheme();

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

resetFeed();
