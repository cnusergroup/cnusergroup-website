/* Pure Frontend Pagination and Filtering for Static Deployment */
function initEventSearch() {
  
  const searchInput = document.getElementById('event-search');
  const statusFilter = document.getElementById('statusFilter');
  const cityFilter = document.getElementById('cityFilter');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const clearAllFiltersBtn = document.getElementById('clearAllFilters');
  const resultsCount = document.getElementById('results-count');
  const searchResultsCount = document.getElementById('searchResultsCount');
  
  /* Get all event cards and extract data */
  const allEventCards = Array.from(document.querySelectorAll('[data-event-id]'));
  const eventsPerPage = 12;
  let currentPage = 1;
  let filteredEvents = [];
  
  if (allEventCards.length === 0) {
    setTimeout(initEventSearch, 500); /* Retry after 500ms */
    return;
  }

  /* Extract event data from DOM */
  const allEventsData = allEventCards.map(function(card) {
    const eventData = {
      element: card,
      id: card.dataset.eventId || '',
      title: (card.dataset.eventTitle || '').toLowerCase(),
      location: (card.dataset.eventLocation || '').toLowerCase(),
      status: card.dataset.eventStatus || 'ended',
      cities: (card.dataset.eventCities || '').toLowerCase(),
      tags: (card.dataset.eventTags || '').toLowerCase(),
      time: (card.dataset.eventTime || '').toLowerCase(),
      formattedDate: (card.dataset.eventFormattedDate || '').toLowerCase(),
      originalIndex: allEventCards.indexOf(card)
    };
    return eventData;
  });

  /* Set initial filter values from URL */
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || '';
  const status = urlParams.get('status') || 'all';
  const city = urlParams.get('city') || '';
  const pageFromUrl = parseInt(urlParams.get('page') || '1');

  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }
  if (statusFilter) {
    statusFilter.value = status;
  }
  if (cityFilter && city) {
    cityFilter.value = city;
  }

  function filterEvents() {
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const statusValue = statusFilter?.value || 'all';
    const cityValue = cityFilter?.value || '';

    filteredEvents = allEventsData.filter(function(event) {
      /* Search matching */
      let matchesSearch = true;
      if (searchTerm) {
        const searchFields = [
          event.title,
          event.location,
          event.cities,
          event.tags,
          event.time,
          event.formattedDate
        ];
        
        const searchText = searchFields.join(' ');
        const searchTerms = searchTerm.split(/\s+/).filter(function(term) { return term.length > 0; });
        matchesSearch = searchTerms.every(function(term) { return searchText.includes(term); });
      }

      /* Status matching */
      let matchesStatus = true;
      if (statusValue !== 'all') {
        if (statusValue === 'upcoming') {
          matchesStatus = event.status === 'upcoming';
        } else if (statusValue === 'past') {
          matchesStatus = event.status === 'ended';
        }
      }

      /* City matching */
      let matchesCity = true;
      if (cityValue) {
        matchesCity = event.cities.includes(cityValue.toLowerCase());
      }

      return matchesSearch && matchesStatus && matchesCity;
    });

    /* Reset to page 1 when filtering changes */
    const hasFilters = searchTerm || statusValue !== 'all' || cityValue;
    if (hasFilters) {
      currentPage = 1;
    } else {
      currentPage = pageFromUrl;
    }

    updateDisplay();
    updateURL();
  }

  function updateDisplay() {
    /* Calculate pagination */
    const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
    
    /* Ensure current page is within valid range */
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }
    
    const startIndex = (currentPage - 1) * eventsPerPage;
    const endIndex = startIndex + eventsPerPage;
    const currentPageEvents = filteredEvents.slice(startIndex, endIndex);

    /* Hide all cards first */
    allEventCards.forEach(function(card) {
      card.style.display = 'none';
    });

    /* Show only current page events */
    currentPageEvents.forEach(function(event) {
      event.element.style.display = 'block';
    });

    /* Update results count */
    updateResultsCount(filteredEvents.length, startIndex + 1, Math.min(endIndex, filteredEvents.length));
    
    /* Update clear buttons */
    updateClearButtons();
    
    /* Update pagination */
    updatePagination(totalPages);
  }

  function updateResultsCount(total, start, end) {
    const lang = document.documentElement.lang || 'zh';
    
    let text;
    if (total === 0) {
      text = lang === 'zh' ? '未找到匹配的活动' : 'No events found';
    } else if (total <= eventsPerPage) {
      text = lang === 'zh' 
        ? '显示 ' + total + ' 个活动' 
        : 'Showing ' + total + ' events';
    } else {
      text = lang === 'zh' 
        ? '显示第 ' + start + ' - ' + end + ' 项，共 ' + total + ' 项结果'
        : 'Showing ' + start + ' - ' + end + ' of ' + total + ' events';
    }
    
    if (resultsCount) {
      resultsCount.textContent = text;
    }
    if (searchResultsCount) {
      searchResultsCount.textContent = text;
    }
  }

  function updateClearButtons() {
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const statusValue = statusFilter?.value || 'all';
    const cityValue = cityFilter?.value || '';
    const hasFilters = searchTerm || statusValue !== 'all' || cityValue;
    
    if (clearFiltersBtn) {
      clearFiltersBtn.classList.toggle('hidden', !hasFilters);
    }
    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.classList.toggle('hidden', !hasFilters);
    }
  }

  function updatePagination(totalPages) {
    /* Find the pagination container that contains the nav element */
    const paginationNav = document.querySelector('nav[aria-label="Pagination"]');
    let paginationContainer = null;
    
    if (paginationNav) {
      /* Find the parent container that has the pagination structure */
      paginationContainer = paginationNav.closest('.flex.items-center.justify-between');
    }
    
    if (!paginationContainer || !paginationNav) return;

    /* Hide pagination if no results or only one page */
    if (totalPages <= 1 || filteredEvents.length === 0) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';
    
    /* Update pagination info text */
    const paginationInfo = paginationContainer.querySelector('p');
    if (paginationInfo) {
      const start = (currentPage - 1) * eventsPerPage + 1;
      const end = Math.min(currentPage * eventsPerPage, filteredEvents.length);
      const lang = document.documentElement.lang || 'zh';
      const text = lang === 'zh' 
        ? '显示第 ' + start + ' - ' + end + ' 项，共 ' + filteredEvents.length + ' 项结果'
        : 'Showing ' + start + ' - ' + end + ' of ' + filteredEvents.length + ' results';
      paginationInfo.textContent = text;
    }

    /* Rebuild pagination buttons */
    paginationNav.innerHTML = '';

    /* Previous button */
    const prevButton = document.createElement('button');
    prevButton.className = 'relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ' + 
      (currentPage > 1 ? 'bg-white text-gray-500 hover:bg-gray-50 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed');
    prevButton.innerHTML = '<span class="sr-only">Previous</span><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>';
    
    if (currentPage > 1) {
      prevButton.addEventListener('click', function() {
        currentPage--;
        updateDisplay();
      });
    }
    paginationNav.appendChild(prevButton);

    /* Page numbers (show max 5 pages) */
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = 'relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ' +
        (i === currentPage 
          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50');
      pageButton.textContent = i;
      pageButton.addEventListener('click', function() {
        currentPage = i;
        updateDisplay();
      });
      paginationNav.appendChild(pageButton);
    }

    /* Next button */
    const nextButton = document.createElement('button');
    nextButton.className = 'relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ' +
      (currentPage < totalPages ? 'bg-white text-gray-500 hover:bg-gray-50 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed');
    nextButton.innerHTML = '<span class="sr-only">Next</span><svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>';
    
    if (currentPage < totalPages) {
      nextButton.addEventListener('click', function() {
        currentPage++;
        updateDisplay();
      });
    }
    paginationNav.appendChild(nextButton);
  }

  function updateURL() {
    const searchTerm = searchInput?.value.trim() || '';
    const statusValue = statusFilter?.value || 'all';
    const cityValue = cityFilter?.value || '';
    
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('q', searchTerm);
    if (statusValue !== 'all') params.set('status', statusValue);
    if (cityValue) params.set('city', cityValue);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }

  function clearFilters() {
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    if (cityFilter) cityFilter.value = '';
    currentPage = 1;
    
    filterEvents();
  }

  /* Bind event listeners */
  if (searchInput) {
    searchInput.addEventListener('input', filterEvents);
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        filterEvents();
      }
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', filterEvents);
  }

  if (cityFilter) {
    cityFilter.addEventListener('change', filterEvents);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }
  
  if (clearAllFiltersBtn) {
    clearAllFiltersBtn.addEventListener('click', clearFilters);
  }

  /* Initial setup */
  filterEvents();
}

/* Multiple initialization strategies for GitHub Pages compatibility */
let initAttempts = 0;
const maxAttempts = 5;

function tryInitialize() {
  initAttempts++;
  
  /* Check if we have event cards */
  const eventCards = document.querySelectorAll('[data-event-id]');
  
  if (eventCards.length > 0) {
    initEventSearch();
    return true;
  } else if (initAttempts < maxAttempts) {
    setTimeout(tryInitialize, 500);
    return false;
  } else {
    return false;
  }
}

/* Strategy 1: DOM ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    tryInitialize();
  });
} else {
  tryInitialize();
}

/* Strategy 2: Window load (backup) */
window.addEventListener('load', function() {
  setTimeout(function() {
    const eventCards = document.querySelectorAll('[data-event-id]');
    if (eventCards.length > 0 && typeof initEventSearch === 'function') {
      initEventSearch();
    }
  }, 100);
});

/* Strategy 3: Delayed initialization for GitHub Pages */
setTimeout(function() {
  const eventCards = document.querySelectorAll('[data-event-id]');
  if (eventCards.length > 0) {
    if (typeof initEventSearch === 'function') {
      initEventSearch();
    }
  }
}, 2000);