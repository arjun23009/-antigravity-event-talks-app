/**
 * BigQuery Release Navigator
 * Vanilla JavaScript Front-End Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let rawEntries = [];      // Raw entry data from RSS Feed API
    let allUpdates = [];      // Parsed individual updates from entries
    let selectedUpdate = null; // Currently selected update for tweeting
    let currentFilterType = 'all';
    let searchQuery = '';
    
    // Twitter/X constants
    const MAX_TWEET_CHARS = 280;
    const TWITTER_URL_LEN = 23; // Twitter wraps all links to 23 chars
    
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdatedText = document.getElementById('last-updated-text');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const typeFilters = document.getElementById('type-filters');
    const statsSummary = document.getElementById('stats-summary');
    const displayedCount = document.getElementById('displayed-count');
    const totalCount = document.getElementById('total-count');
    
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const emptyState = document.getElementById('empty-state');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const feedContainer = document.getElementById('feed-container');
    
    // Composer DOM Elements
    const composerCard = document.getElementById('tweet-composer-card');
    const composerStatusDot = document.getElementById('composer-status-dot');
    const composerEmptyState = document.getElementById('composer-empty-state');
    const composerActiveState = document.getElementById('composer-active-state');
    const composerBadge = document.getElementById('composer-badge');
    const composerDate = document.getElementById('composer-date');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const tweetBtn = document.getElementById('tweet-btn');
    const composerOriginalLink = document.getElementById('composer-original-link');
    const charCountEl = document.getElementById('char-count');
    const charProgressCircle = document.getElementById('char-progress');
    
    // Progress Ring Properties
    const ringRadius = 10;
    const ringCircumference = 2 * Math.PI * ringRadius;
    charProgressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    charProgressCircle.style.strokeDashoffset = ringCircumference;

    // ==========================================================================
    // Data Fetching & Caching
    // ==========================================================================
    
    async function loadReleaseNotes(forceRefresh = false) {
        showLoading();
        if (forceRefresh) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        }
        
        try {
            const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                rawEntries = result.data;
                
                // Format the timestamp
                const date = new Date(result.last_fetched * 1000);
                lastUpdatedText.textContent = `Feed updated: ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                
                // Parse updates
                processEntriesToUpdates();
                
                // Render view
                filterAndRenderFeed();
                
                // Restore composer selection if it exists
                if (selectedUpdate) {
                    const exists = allUpdates.find(u => u.id === selectedUpdate.id);
                    if (exists) {
                        selectUpdate(exists);
                    } else {
                        deselectUpdate();
                    }
                }
            } else {
                throw new Error(result.message || 'API responded with error state.');
            }
        } catch (error) {
            console.error('Failed to load release notes:', error);
            showError(error.message || 'Failed to fetch release notes from the server.');
        } finally {
            if (forceRefresh) {
                refreshIcon.classList.remove('spinning');
                refreshBtn.disabled = false;
            }
        }
    }

    // ==========================================================================
    // XML HTML Parsing Logic
    // ==========================================================================
    
    function processEntriesToUpdates() {
        allUpdates = [];
        
        rawEntries.forEach(entry => {
            const dateStr = entry.title; // e.g., "June 15, 2026"
            const contentHtml = entry.content;
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(contentHtml, 'text/html');
            
            let currentType = 'General';
            let currentHtml = '';
            let updateIndex = 0;
            
            const children = Array.from(doc.body.children);
            
            children.forEach(child => {
                if (child.tagName === 'H3') {
                    // Save previous update if any
                    if (currentHtml.trim()) {
                        allUpdates.push({
                            id: `${entry.id}_${updateIndex}`,
                            date: dateStr,
                            type: currentType,
                            content: currentHtml,
                            link: entry.link
                        });
                        updateIndex++;
                    }
                    // Reset for next update
                    currentType = child.textContent.trim();
                    currentHtml = '';
                } else {
                    currentHtml += child.outerHTML;
                }
            });
            
            // Push final parsed update
            if (currentHtml.trim() || currentType !== 'General') {
                allUpdates.push({
                    id: `${entry.id}_${updateIndex}`,
                    date: dateStr,
                    type: currentType || 'General',
                    content: currentHtml || '<p>Release note details are available in the link.</p>',
                    link: entry.link
                });
            }
            
            // Fallback if no H3 elements were parsed
            if (updateIndex === 0 && allUpdates.filter(u => u.id.startsWith(entry.id)).length === 0) {
                allUpdates.push({
                    id: entry.id,
                    date: dateStr,
                    type: 'General',
                    content: contentHtml,
                    link: entry.link
                });
            }
        });
    }

    // ==========================================================================
    // Render and Filter UI
    // ==========================================================================
    
    function filterAndRenderFeed() {
        // Apply filters
        const filtered = allUpdates.filter(update => {
            // Filter by type
            const matchesType = (currentFilterType === 'all') || 
                               (update.type.toLowerCase() === currentFilterType.toLowerCase());
            
            // Filter by search text
            let matchesSearch = true;
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const textContent = stripHtml(update.content).toLowerCase();
                const typeText = update.type.toLowerCase();
                const dateText = update.date.toLowerCase();
                matchesSearch = textContent.includes(query) || 
                                typeText.includes(query) || 
                                dateText.includes(query);
            }
            
            return matchesType && matchesSearch;
        });
        
        // Update Stats Summary
        displayedCount.textContent = filtered.length;
        totalCount.textContent = allUpdates.length;
        
        // Toggle view states
        if (filtered.length === 0) {
            feedContainer.style.display = 'none';
            loadingState.style.display = 'none';
            errorState.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            loadingState.style.display = 'none';
            errorState.style.display = 'none';
            feedContainer.style.display = 'flex';
            
            // Render HTML items
            renderFeedItems(filtered);
        }
    }
    
    function renderFeedItems(updates) {
        feedContainer.innerHTML = '';
        
        updates.forEach(update => {
            const card = document.createElement('article');
            card.className = 'release-card';
            card.id = `card-${update.id}`;
            card.setAttribute('aria-selected', 'false');
            card.setAttribute('tabindex', '0');
            
            if (selectedUpdate && selectedUpdate.id === update.id) {
                card.classList.add('selected');
                card.setAttribute('aria-selected', 'true');
            }
            
            const badgeClass = getBadgeClass(update.type);
            
            card.innerHTML = `
                <div class="release-card-header">
                    <span class="badge ${badgeClass}">${update.type}</span>
                    <span class="date-text">${update.date}</span>
                </div>
                <div class="release-card-body">
                    ${update.content}
                </div>
                <div class="release-action-hint">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Select to Tweet</span>
                </div>
            `;
            
            // Add click events
            card.addEventListener('click', () => {
                selectUpdate(update);
            });
            
            // Add keyboard navigation
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectUpdate(update);
                }
            });
            
            feedContainer.appendChild(card);
        });
    }

    // ==========================================================================
    // Selection and Tweet Composer Actions
    // ==========================================================================
    
    function selectUpdate(update) {
        // Deselect previous card in DOM
        if (selectedUpdate) {
            const prevCard = document.getElementById(`card-${selectedUpdate.id}`);
            if (prevCard) {
                prevCard.classList.remove('selected');
                prevCard.setAttribute('aria-selected', 'false');
            }
        }
        
        // Select new card
        selectedUpdate = update;
        const newCard = document.getElementById(`card-${update.id}`);
        if (newCard) {
            newCard.classList.add('selected');
            newCard.setAttribute('aria-selected', 'true');
        }
        
        // Activate Composer
        composerEmptyState.style.display = 'none';
        composerActiveState.style.display = 'flex';
        composerStatusDot.classList.add('active');
        
        // Set values in composer
        composerBadge.textContent = update.type;
        composerBadge.className = `badge ${getBadgeClass(update.type)}`;
        composerDate.textContent = update.date;
        composerOriginalLink.href = update.link;
        
        // Generate prefilled Tweet Text
        const prefilledText = generateTweetText(update);
        tweetTextarea.value = prefilledText;
        
        updateCharCount();
        
        // Scroll composer into view on mobile
        if (window.innerWidth <= 1100) {
            composerCard.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    function deselectUpdate() {
        if (selectedUpdate) {
            const prevCard = document.getElementById(`card-${selectedUpdate.id}`);
            if (prevCard) {
                prevCard.classList.remove('selected');
                prevCard.setAttribute('aria-selected', 'false');
            }
        }
        selectedUpdate = null;
        composerActiveState.style.display = 'none';
        composerEmptyState.style.display = 'flex';
        composerStatusDot.classList.remove('active');
    }
    
    function generateTweetText(update) {
        const dateStr = update.date;
        const typeStr = update.type;
        const rawContentText = stripHtml(update.content);
        const linkStr = update.link;
        
        // Base structure:
        // 📢 BigQuery [Type] (Date)
        // [Content snippet]
        // Info: [Link] #BigQuery #GoogleCloud
        
        const emojiMap = {
            'Feature': '🚀',
            'Announcement': '📢',
            'Issue': '⚠️',
            'Deprecation': '🛑',
            'General': '⚡'
        };
        const emoji = emojiMap[typeStr] || '⚡';
        
        const header = `${emoji} BigQuery ${typeStr} (${dateStr}):\n`;
        const footer = `\n\nMore: ${linkStr} #BigQuery #GoogleCloud`;
        
        // Let's compute length constraints
        // Twitter treats links as exactly 23 characters.
        const headerLen = header.length;
        const hashtagsAndExtraLen = 25; // Estimate of tags and spacing
        const linkLen = TWITTER_URL_LEN;
        const availableContentLen = MAX_TWEET_CHARS - headerLen - linkLen - hashtagsAndExtraLen;
        
        let truncatedContent = rawContentText;
        if (rawContentText.length > availableContentLen) {
            truncatedContent = rawContentText.substring(0, availableContentLen - 4) + '...';
        }
        
        return `${header}${truncatedContent}${footer}`;
    }
    
    function getTwitterLength(text) {
        // Replace all URL strings with a dummy 23 char string
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex) || [];
        const textWithoutUrls = text.replace(urlRegex, '');
        
        return textWithoutUrls.length + (urls.length * TWITTER_URL_LEN);
    }
    
    function updateCharCount() {
        const text = tweetTextarea.value;
        const currentLength = getTwitterLength(text);
        const remaining = MAX_TWEET_CHARS - currentLength;
        
        charCountEl.textContent = remaining;
        
        // Progress ring styling
        const ratio = Math.min(currentLength / MAX_TWEET_CHARS, 1);
        const offset = ringCircumference - (ratio * ringCircumference);
        charProgressCircle.style.strokeDashoffset = offset;
        
        // Colors & warnings
        charCountEl.className = '';
        charProgressCircle.classList.remove('progress-ring-warning', 'progress-ring-danger');
        
        if (remaining <= 0) {
            charCountEl.classList.add('char-danger');
            charProgressCircle.classList.add('progress-ring-danger');
            charProgressCircle.style.stroke = 'var(--type-issue)';
            tweetBtn.disabled = true;
            tweetBtn.style.opacity = '0.5';
        } else if (remaining <= 20) {
            charCountEl.classList.add('char-warning');
            charProgressCircle.classList.add('progress-ring-warning');
            charProgressCircle.style.stroke = 'var(--type-deprecation)';
            tweetBtn.disabled = false;
            tweetBtn.style.opacity = '1';
        } else {
            charProgressCircle.style.stroke = 'var(--color-primary)';
            tweetBtn.disabled = false;
            tweetBtn.style.opacity = '1';
        }
    }

    // ==========================================================================
    // UI Utility Helpers
    // ==========================================================================
    
    function getBadgeClass(type) {
        const t = type.toLowerCase();
        if (t === 'feature') return 'badge-feature';
        if (t === 'announcement') return 'badge-announcement';
        if (t === 'issue') return 'badge-issue';
        if (t === 'deprecation') return 'badge-deprecation';
        return 'badge-general';
    }
    
    function stripHtml(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Google Cloud release notes often contain tags with text.
        // We clean up line breaks and spacings.
        let text = temp.textContent || temp.innerText || '';
        text = text.replace(/\s+/g, ' '); // collapse whitespace
        return text.trim();
    }
    
    function showLoading() {
        loadingState.style.display = 'flex';
        feedContainer.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        loadingState.style.display = 'none';
        feedContainer.style.display = 'none';
        emptyState.style.display = 'none';
        errorState.style.display = 'block';
    }
    
    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    
    // Refresh feed
    refreshBtn.addEventListener('click', () => loadReleaseNotes(true));
    retryBtn.addEventListener('click', () => loadReleaseNotes(true));
    
    // Search filter input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.trim() !== '') {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        filterAndRenderFeed();
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        filterAndRenderFeed();
    });
    
    // Filter by type click handlers
    typeFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from previous
        typeFilters.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked
        pill.classList.add('active');
        currentFilterType = pill.getAttribute('data-type');
        
        filterAndRenderFeed();
    });
    
    // Reset filters
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        typeFilters.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-type') === 'all') {
                btn.classList.add('active');
            }
        });
        
        currentFilterType = 'all';
        filterAndRenderFeed();
    });
    
    // Tweet composer input listener
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Tweet trigger
    tweetBtn.addEventListener('click', () => {
        if (!selectedUpdate) return;
        const text = tweetTextarea.value;
        
        // Open Twitter/X intent sharing page
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    });
    
    // Initial load
    loadReleaseNotes();
});
