const CONFIG = {
    metadataUrl: './templates-metadata.json',
    previewsPath: './previews',
    templatesPath: './templates',
    pageSize: 24,
    cacheKey: 'templates_cache',
    cacheDuration: 3600000,
};

const categoryConfig = {
    'badges-icons': { name: '🏷️ Badges & Icons', emoji: '🏷️' },
    'code-focused': { name: '💻 Code Focused', emoji: '💻' },
    'creative-artistic': { name: '🎨 Creative & Artistic', emoji: '🎨' },
    'data-visual': { name: '📊 Data & Visual', emoji: '📊' },
    'dynamic-interactive': { name: '⚡ Dynamic & Interactive', emoji: '⚡' },
    'media-rich': { name: '🎬 Media Rich', emoji: '🎬' },
    'minimalistic': { name: '🎯 Minimalistic', emoji: '🎯' },
    'showcase-collections': { name: '✨ Showcase Collections', emoji: '✨' },
    'others': { name: '🔧 Others', emoji: '🔧' }
};

const state = {
    metadata: null,
    templates: [],
    filteredTemplates: [],
    currentFilter: 'all',
    searchTerm: '',
    currentPage: 0,
    isLoading: false,
    templateContents: {},
    hasMore: true
};

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadMetadata();
    setupIntersectionObserver();
});

async function loadMetadata() {
    const loadingElement = document.getElementById('templatesGrid');
    loadingElement.innerHTML = '<div class="loading">⚡ Loading templates metadata...</div>';
    
    try {
        const cached = getCachedMetadata();
        if (cached) {
            state.metadata = cached;
        } else {
            const response = await fetch(CONFIG.metadataUrl);
            if (!response.ok) throw new Error('Failed to fetch metadata');
            
            state.metadata = await response.json();
            cacheMetadata(state.metadata);
        }
        
        processMetadata();
        updateFilterButtons();
        updateStats();
        renderTemplates();
        
    } catch (error) {
        console.error('Error loading metadata:', error);
        loadingElement.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>❌ Error Loading Templates</h3>
                <p>Unable to load templates metadata.</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 16px;">
                    🔄 Reload Page
                </button>
            </div>
        `;
    }
}

function processMetadata() {
    state.templates = [];
    const categories = state.metadata.categories || state.metadata;
    
    Object.entries(categories).forEach(([categoryKey, data]) => {
        const files = data.files || data;
        const categoryInfo = categoryConfig[categoryKey] || { name: categoryKey, emoji: '📁' };
        
        files.forEach(filename => {
            const templateId = filename.replace('.md', '');
            const author = templateId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            state.templates.push({
                id: `${categoryKey}-${templateId}`,
                filename,
                category: categoryKey,
                categoryName: categoryInfo.name,
                categoryEmoji: categoryInfo.emoji,
                author,
                name: `${categoryInfo.emoji} ${author}`,
                previewImage: `${CONFIG.previewsPath}/${categoryKey}-${templateId}.png`,
                filePath: `${CONFIG.templatesPath}/${categoryKey}/${filename}`,
            });
        });
    });
    
    state.filteredTemplates = [...state.templates];
}

function getCachedMetadata() {
    try {
        const cached = sessionStorage.getItem(CONFIG.cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CONFIG.cacheDuration) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }
    return null;
}

function cacheMetadata(data) {
    try {
        sessionStorage.setItem(CONFIG.cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.warn('Cache write error:', e);
    }
}

function applyFilters() {
    let filtered = state.templates;
    
    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(t => t.category === state.currentFilter);
    }
    
    if (state.searchTerm) {
        const searchLower = state.searchTerm.toLowerCase();
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(searchLower) ||
            t.author.toLowerCase().includes(searchLower) ||
            t.category.toLowerCase().includes(searchLower)
        );
    }
    
    state.filteredTemplates = filtered;
    state.currentPage = 0;
    state.hasMore = true;
}

function renderTemplates(append = false) {
    const grid = document.getElementById('templatesGrid');
    
    if (append) {
        state.isLoading = true;
        document.getElementById('loadMoreTrigger')?.remove();
    }
    
    if (!append) {
        grid.innerHTML = '';
        state.currentPage = 0;
    }
    
    if (state.filteredTemplates.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3>🔍 No templates found</h3>
                <p>Try adjusting your search or filter criteria.</p>
                <button onclick="resetFilters()" class="btn btn-primary" style="margin-top: 16px;">
                    Clear Filters
                </button>
            </div>
        `;
        state.isLoading = false;
        return;
    }
    
    const startIdx = state.currentPage * CONFIG.pageSize;
    const endIdx = Math.min(startIdx + CONFIG.pageSize, state.filteredTemplates.length);
    const pageTemplates = state.filteredTemplates.slice(startIdx, endIdx);
    
    const templatesHTML = pageTemplates.map(createTemplateCard).join('');
    
    if (append) {
        grid.insertAdjacentHTML('beforeend', templatesHTML);
    } else {
        grid.innerHTML = templatesHTML;
    }
    
    state.currentPage++;
    state.hasMore = endIdx < state.filteredTemplates.length;
    state.isLoading = false;
    
    if (state.hasMore) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadMoreTrigger';
        loadingDiv.style.cssText = 'grid-column: 1 / -1; height: 100px; display: flex; align-items: center; justify-content: center;';
        loadingDiv.innerHTML = '<div class="loading">Loading more...</div>';
        grid.appendChild(loadingDiv);
        
        setTimeout(() => {
            const trigger = document.getElementById('loadMoreTrigger');
            if (trigger && window.scrollObserver) {
                window.scrollObserver.observe(trigger);
            }
        }, 100);
    }
}

function createTemplateCard(template) {
    const fallbackImg = './previews/default-preview.svg';
    
    return `
        <div class="template-card" onclick="openTemplate('${template.id}')">
            <div class="category">${template.categoryName}</div>
            <div class="template-preview-image">
                <img src="${template.previewImage}" 
                     alt="${template.name}" 
                     loading="lazy"
                     style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin: 12px 0;"
                     onerror="this.src='${fallbackImg}'">
            </div>
            <div class="template-meta">
                <span class="author">👤 ${template.author}</span>
            </div>
            <div class="template-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation(); openTemplate('${template.id}')">
                    👁️ Preview
                </button>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); downloadTemplate('${template.id}')">
                    💾 Download
                </button>
            </div>
        </div>
    `;
}

function setupIntersectionObserver() {
    window.scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && state.hasMore && !state.isLoading) {
                renderTemplates(true);
            }
        });
    }, {
        rootMargin: '200px'
    });
    
    const observeLoadingTrigger = () => {
        const trigger = document.getElementById('loadMoreTrigger');
        if (trigger) {
            window.scrollObserver.observe(trigger);
        } else {
            setTimeout(observeLoadingTrigger, 100);
        }
    };
    
    observeLoadingTrigger();
}

async function loadTemplateContent(templateId) {
    if (state.templateContents[templateId]) {
        return state.templateContents[templateId];
    }
    
    const template = state.templates.find(t => t.id === templateId);
    if (!template) return null;
    
    try {
        const response = await fetch(template.filePath);
        if (!response.ok) throw new Error('Failed to fetch template');
        
        const content = await response.text();
        state.templateContents[templateId] = content;
        return content;
    } catch (error) {
        console.error(`Error loading template ${templateId}:`, error);
        return null;
    }
}

async function openTemplate(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
        alert('Template not found');
        return;
    }
    
    const modal = document.getElementById('templateModal');
    document.getElementById('modalTitle').innerHTML = `
        ${template.name}
        <div class="modal-subtitle">by ${template.author} • ${template.categoryName}</div>
    `;
    
    const previewContent = document.getElementById('previewContent');
    const codeElement = document.getElementById('rawCode');
    
    previewContent.innerHTML = '<div class="loading">Loading template...</div>';
    codeElement.textContent = 'Loading...';
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchTab('preview');
    
    const content = await loadTemplateContent(templateId);
    
    if (!content) {
        previewContent.innerHTML = '<div class="error-message">Failed to load template content</div>';
        return;
    }
    
    previewContent.innerHTML = marked.parse(content);
    codeElement.textContent = content;
    codeElement.className = 'language-markdown';
    hljs.highlightElement(codeElement);
}

function closeModal() {
    document.getElementById('templateModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + 'Content').classList.add('active');
}

async function copyCode() {
    const codeElement = document.getElementById('rawCode');
    try {
        await navigator.clipboard.writeText(codeElement.textContent);
        showCopyFeedback(event.target, '✅ Copied!');
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Please try manually.');
    }
}

function updateFilterButtons() {
    const filterContainer = document.querySelector('.filter-tags');
    const categoryCounts = {};
    
    state.templates.forEach(t => {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });
    
    filterContainer.innerHTML = '';
    
    const allBtn = createFilterButton('all', 'All', '🌟', state.templates.length);
    filterContainer.appendChild(allBtn);
    
    Object.entries(categoryConfig)
        .filter(([key]) => categoryCounts[key] > 0)
        .forEach(([key, data]) => {
            const btn = createFilterButton(key, data.name.replace(/^[^\s]+\s/, ''), data.emoji, categoryCounts[key]);
            filterContainer.appendChild(btn);
        });
    
    setActiveFilter('all');
}

function createFilterButton(category, name, emoji, count) {
    const button = document.createElement('button');
    button.className = 'tag-btn';
    button.dataset.category = category;
    button.innerHTML = `${emoji} ${name} (${count})`;
    
    button.addEventListener('click', () => {
        state.currentFilter = category;
        setActiveFilter(category);
        applyFilters();
        renderTemplates();
    });
    
    return button;
}

function setActiveFilter(category) {
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchTerm = this.value.toLowerCase();
            applyFilters();
            renderTemplates();
        }, 300);
    });
    
    const modal = document.getElementById('templateModal');
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
}

function resetFilters() {
    state.currentFilter = 'all';
    state.searchTerm = '';
    document.getElementById('searchInput').value = '';
    setActiveFilter('all');
    applyFilters();
    renderTemplates();
}

function updateStats() {
    const statsElement = document.getElementById('templateCount');
    if (statsElement) {
        statsElement.textContent = state.templates.length;
    }
}

async function copyTemplateUrl(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) return;
    
    const url = `${window.location.origin}${window.location.pathname}?template=${templateId}`;
    
    try {
        await navigator.clipboard.writeText(url);
        showCopyFeedback(event.target, '✅ Copied!');
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function showCopyFeedback(button, message) {
    const original = button.innerHTML;
    button.innerHTML = message;
    button.style.background = 'var(--success-color)';
    
    setTimeout(() => {
        button.innerHTML = original;
        button.style.background = '';
    }, 2000);
}

async function downloadTemplate(templateId) {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) return;
    
    const content = await loadTemplateContent(templateId);
    if (!content) {
        alert('Failed to load template content');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}-readme.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showContributeModal() {
    const modal = document.getElementById('contributeModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeContributeModal() {
    const modal = document.getElementById('contributeModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}
