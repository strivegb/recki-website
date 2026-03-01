// Recki.ai — Open Graph Checker
(function () {
  const form = document.getElementById('og-form');
  const urlInput = document.getElementById('url-input');
  const checkBtn = document.getElementById('check-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorMsg = document.getElementById('error-msg');
  const resultsSection = document.getElementById('results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    setLoading(true);
    hideError();

    try {
      const data = await fetchOGData(url);
      renderPreviews(data);
      renderWarnings(data);
      renderRawTags(data);
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showError(err.message || 'Failed to fetch OG data. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    checkBtn.disabled = loading;
    btnText.textContent = loading ? 'Checking...' : 'Check URL';
    btnSpinner.classList.toggle('hidden', !loading);
    if (loading) {
      checkBtn.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
      checkBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
  }

  function hideError() {
    errorMsg.classList.add('hidden');
  }

  // Fetch OG data using Microlink API
  async function fetchOGData(url) {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      throw new Error('Could not reach the URL. Please verify it is correct and publicly accessible.');
    }

    const json = await res.json();

    if (json.status === 'fail') {
      throw new Error(json.data?.message || 'Failed to extract data from this URL.');
    }

    const d = json.data || {};

    // Extract domain from URL
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch (_) {
      domain = url;
    }

    return {
      url: d.url || url,
      domain: domain,
      title: d.title || '',
      description: d.description || '',
      image: d.image?.url || '',
      imageWidth: d.image?.width || 0,
      imageHeight: d.image?.height || 0,
      logo: d.logo?.url || '',
      author: d.author || '',
      publisher: d.publisher || '',
      lang: d.lang || '',
      // Raw data for tag display
      raw: {
        'og:title': d.title || '',
        'og:description': d.description || '',
        'og:image': d.image?.url || '',
        'og:url': d.url || url,
        'og:type': d.type || '',
        'og:site_name': d.publisher || '',
        'twitter:card': d.image?.url ? 'summary_large_image' : 'summary',
        'twitter:title': d.title || '',
        'twitter:description': d.description || '',
        'twitter:image': d.image?.url || '',
        'author': d.author || '',
        'lang': d.lang || '',
      },
    };
  }

  // Render preview cards
  function renderPreviews(data) {
    // Twitter/X
    setImage('twitter-image', data.image);
    setText('twitter-domain', data.domain);
    setText('twitter-title', data.title || 'No title found');
    setText('twitter-desc', data.description || 'No description found');

    // Facebook
    setImage('fb-image', data.image);
    setText('fb-domain', data.domain);
    setText('fb-title', data.title || 'No title found');
    setText('fb-desc', data.description || 'No description found');

    // LinkedIn
    setImage('li-image', data.image);
    setText('li-title', data.title || 'No title found');
    setText('li-domain', data.domain);

    // Slack
    setImage('slack-image', data.image);
    setText('slack-domain', data.domain);
    setText('slack-title', data.title || 'No title found');
    setText('slack-desc', data.description || 'No description found');
  }

  function setImage(id, src) {
    const el = document.getElementById(id);
    if (src) {
      el.innerHTML = `<img src="${escapeAttr(src)}" alt="Preview" class="preview-img" onerror="this.parentElement.innerHTML='<span class=\\'text-gray-600\\'>Image failed to load</span>'">`;
    } else {
      el.innerHTML = '<span class="text-gray-600">No image found</span>';
    }
  }

  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Render warnings
  function renderWarnings(data) {
    const warnings = [];

    if (!data.title) {
      warnings.push('Missing <code>og:title</code> — social platforms will fall back to the page &lt;title&gt; tag or URL.');
    }
    if (data.title && data.title.length > 90) {
      warnings.push(`<code>og:title</code> is ${data.title.length} characters — may be truncated on some platforms (recommended: under 70).`);
    }
    if (!data.description) {
      warnings.push('Missing <code>og:description</code> — social cards will show no snippet text.');
    }
    if (data.description && data.description.length > 200) {
      warnings.push(`<code>og:description</code> is ${data.description.length} characters — may be truncated (recommended: under 160).`);
    }
    if (!data.image) {
      warnings.push('Missing <code>og:image</code> — social cards will appear without a visual, drastically reducing click-through rates.');
    }
    if (data.imageWidth && data.imageWidth < 200) {
      warnings.push(`<code>og:image</code> width is only ${data.imageWidth}px — recommended minimum is 1200px for high-quality previews.`);
    }

    const warningsContainer = document.getElementById('warnings');
    const warningsList = document.getElementById('warnings-list');

    if (warnings.length > 0) {
      warningsList.innerHTML = warnings.map((w) => `<li class="flex items-start gap-2"><span class="text-yellow-400 mt-0.5">&#x26A0;</span><span>${w}</span></li>`).join('');
      warningsContainer.classList.remove('hidden');
    } else {
      warningsContainer.classList.add('hidden');
    }
  }

  // Render raw meta tags table
  function renderRawTags(data) {
    const tbody = document.getElementById('raw-tags-body');
    const rows = Object.entries(data.raw)
      .filter(([, v]) => v)
      .map(([key, value]) => {
        const displayValue = value.length > 120 ? value.slice(0, 120) + '...' : value;
        return `<tr class="border-b border-white/5">
          <td class="py-2 pr-4 text-gray-400 whitespace-nowrap font-mono text-xs">${escapeHtml(key)}</td>
          <td class="py-2 text-gray-300 break-all text-xs">${escapeHtml(displayValue)}</td>
        </tr>`;
      })
      .join('');
    tbody.innerHTML = rows || '<tr><td colspan="2" class="py-2 text-gray-500">No meta tags found</td></tr>';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();