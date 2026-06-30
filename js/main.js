/* ============================================
   Pasta Fresca Da Fabio — main.js
   Connected to Sanity: all content marked with data-sanity-id is fetched
   live from the project's public dataset via GROQ over the HTTP API.
   If a fetch fails (offline, dataset down, etc.) the static text already
   present in index.html is left untouched as a fallback — progressive
   enhancement rather than a hard dependency on the network.
   ============================================ */

(function () {
  'use strict';

  var SANITY_PROJECT_ID = 'zz9i2xeb';
  var SANITY_DATASET = 'production';
  var SANITY_API_VERSION = '2024-01-01';

  function sanityFetch(query) {
    var url =
      'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v' + SANITY_API_VERSION +
      '/data/query/' + SANITY_DATASET + '?query=' + encodeURIComponent(query);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Sanity fetch failed: ' + res.status);
        return res.json();
      })
      .then(function (json) {
        return json.result;
      });
  }

  function formatPrice(value) {
    if (typeof value !== 'number') return '';
    return value.toFixed(2).replace('.', ',') + ' €';
  }

  function setText(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach(function (el) {
      el.textContent = value;
    });
  }

  function setAllTelHrefs(phoneHref) {
    if (!phoneHref) return;
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.href = 'tel:' + phoneHref.replace(/^\+?/, '+');
    });
  }

  /* ---------- Header scroll state ---------- */
  function initHeaderScroll() {
    var header = document.getElementById('site-header');
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 40) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Keep the notification toast positioned just under the navbar ---------- */
  function initNotificationPosition() {
    var toast = document.getElementById('site-notification');
    var header = document.getElementById('site-header');
    if (!toast || !header) return;

    function sync() {
      toast.style.top = (header.offsetHeight + 14) + 'px';
    }

    sync();
    if ('ResizeObserver' in window) {
      new ResizeObserver(sync).observe(header);
    } else {
      window.addEventListener('resize', sync);
    }
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* ---------- Auto-hide the toast once the user scrolls past Hero + Notre Histoire ---------- */
  function initNotificationAutoHide() {
    var toast = document.getElementById('site-notification');
    var aboutSection = document.getElementById('histoire');
    if (!toast || !aboutSection) return;

    function check() {
      if (getComputedStyle(toast).display === 'none') return;
      var aboutBottom = aboutSection.offsetTop + aboutSection.offsetHeight;
      if (window.scrollY > aboutBottom) {
        toast.style.display = 'none';
      }
    }

    window.addEventListener('scroll', check, { passive: true });
  }

  /* ---------- Mobile nav toggle ---------- */
  function initMobileNav() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;

    function closeNav() {
      nav.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  /* ---------- Scroll fade-in animations ---------- */
  function initScrollAnimations() {
    var targets = document.querySelectorAll('.fade-in');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Footer year ---------- */
  function initFooterYear() {
    var yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ============================================
     Sanity-backed content sections
     ============================================ */

  function loadSiteSettings() {
    return sanityFetch(
      '*[_id=="siteSettings"][0]{logoName,logoSub,seoTitle,seoDescription,ogImage{"url":asset->url}}'
    )
      .then(function (data) {
        if (!data) return;
        setText('.brand-name', data.logoName);
        setText('.brand-sub', data.logoSub);
        if (data.seoTitle) document.title = data.seoTitle;
        if (data.seoDescription) {
          var meta = document.querySelector('meta[name="description"]');
          if (meta) meta.setAttribute('content', data.seoDescription);
        }
        if (data.ogImage && data.ogImage.url) {
          var ogMeta = document.getElementById('og-image-meta');
          if (ogMeta) ogMeta.setAttribute('content', data.ogImage.url);
        }
      })
      .catch(function (err) { console.error('siteSettings:', err); });
  }

  function loadHero() {
    return sanityFetch('*[_id=="hero"][0]{kicker,title,subtitle,backgroundImage{"url":asset->url}}')
      .then(function (data) {
        if (!data) return;
        setText('[data-sanity-id="hero.kicker"]', data.kicker);
        setText('[data-sanity-id="hero.subtitle"]', data.subtitle);
        if (data.backgroundImage && data.backgroundImage.url) {
          var photoEl = document.getElementById('hero-photo');
          if (photoEl) photoEl.style.backgroundImage = 'url(' + data.backgroundImage.url + ')';
        }
        if (data.title) {
          var titleEl = document.querySelector('[data-sanity-id="hero.title"]');
          if (titleEl) {
            titleEl.innerHTML = data.title
              .split('\n')
              .map(function (line) {
                return line.replace(/[&<>]/g, function (c) {
                  return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
                });
              })
              .join('<br>');
          }
        }
      })
      .catch(function (err) { console.error('hero:', err); });
  }

  function inlineBold(text) {
    var escaped = text.replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function loadAbout() {
    return sanityFetch('*[_id=="about"][0]{title,body,badges,image{"url":asset->url}}')
      .then(function (data) {
        if (!data) return;
        setText('[data-sanity-id="about.title"]', data.title);

        if (data.image && data.image.url) {
          var frameEl = document.getElementById('about-visual-frame');
          if (frameEl) {
            var img = document.createElement('img');
            img.src = data.image.url;
            img.alt = data.title || 'Pasta Fresca Da Fabio';
            frameEl.innerHTML = '';
            frameEl.appendChild(img);
          }
        }

        if (Array.isArray(data.body) && data.body.length) {
          var bodyEl = document.querySelector('[data-sanity-id="about.body"]');
          if (bodyEl) {
            bodyEl.innerHTML = data.body
              .map(function (paragraph) { return '<p>' + inlineBold(paragraph) + '</p>'; })
              .join('');
          }
        }

        if (Array.isArray(data.badges) && data.badges.length) {
          var badgesEl = document.querySelector('[data-sanity-id="about.badges"]');
          if (badgesEl) {
            badgesEl.innerHTML = data.badges
              .map(function (badge) { return '<span class="badge"></span>'; })
              .join('');
            badgesEl.querySelectorAll('.badge').forEach(function (el, i) {
              el.textContent = data.badges[i];
            });
          }
        }
      })
      .catch(function (err) { console.error('about:', err); });
  }

  function loadHours() {
    return sanityFetch('*[_id=="hours"][0]{schedule,lunchMenuNote,deliveryZones}')
      .then(function (data) {
        if (!data) return;

        if (Array.isArray(data.schedule) && data.schedule.length) {
          var tbody = document.querySelector('.hours-table tbody');
          if (tbody) {
            tbody.innerHTML = '';
            data.schedule.forEach(function (entry) {
              var tr = document.createElement('tr');
              var th = document.createElement('th');
              th.textContent = entry.day;
              var td = document.createElement('td');
              if (entry.closed) {
                td.className = 'closed';
                td.textContent = 'Fermé';
              } else {
                td.textContent = entry.hoursText || '';
              }
              tr.appendChild(th);
              tr.appendChild(td);
              tbody.appendChild(tr);
            });
          }
        }

        if (data.lunchMenuNote) {
          var noteEl = document.querySelector('[data-sanity-id="hours.lunchMenuNote"]');
          if (noteEl) noteEl.textContent = data.lunchMenuNote;
        }

        if (Array.isArray(data.deliveryZones) && data.deliveryZones.length) {
          var listEl = document.querySelector('[data-sanity-id="hours.deliveryZones"]');
          if (listEl) {
            listEl.innerHTML = '';
            data.deliveryZones.forEach(function (zone) {
              var li = document.createElement('li');
              li.textContent = zone;
              listEl.appendChild(li);
            });
          }
        }
      })
      .catch(function (err) { console.error('hours:', err); });
  }

  function loadContact() {
    return sanityFetch(
      '*[_id=="contact"][0]{phone,phoneHref,email,addressLine1,addressLine2,facebookUrl,mapsEmbedQuery,mapsDirectionsQuery}'
    )
      .then(function (data) {
        if (!data) return;

        setText('#contact-phone', data.phone);
        setAllTelHrefs(data.phoneHref);

        if (data.email) {
          document.querySelectorAll('#contact-email').forEach(function (el) {
            el.textContent = data.email;
            el.href = 'mailto:' + data.email;
          });
        }

        var addressEl = document.getElementById('contact-address');
        if (addressEl && (data.addressLine1 || data.addressLine2)) {
          addressEl.innerHTML = '';
          if (data.addressLine1) addressEl.appendChild(document.createTextNode(data.addressLine1));
          if (data.addressLine1 && data.addressLine2) addressEl.appendChild(document.createElement('br'));
          if (data.addressLine2) addressEl.appendChild(document.createTextNode(data.addressLine2));
        }

        var fbLink = document.getElementById('facebook-link');
        if (fbLink && data.facebookUrl) fbLink.href = data.facebookUrl;

        var mapFrame = document.getElementById('map-iframe');
        if (mapFrame && data.mapsEmbedQuery) {
          mapFrame.src = 'https://www.google.com/maps?q=' + data.mapsEmbedQuery + '&output=embed';
        }

        var directionsLink = document.getElementById('directions-link');
        if (directionsLink && data.mapsDirectionsQuery) {
          directionsLink.href = 'https://www.google.com/maps/dir/?api=1&destination=' + data.mapsDirectionsQuery;
        }
      })
      .catch(function (err) { console.error('contact:', err); });
  }

  function starString(rating) {
    var r = Math.round(rating) || 0;
    r = Math.max(0, Math.min(5, r));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  function formatReviewDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-BE', { year: 'numeric', month: 'long' });
  }

  function buildReviewCard(review) {
    var card = document.createElement('div');
    card.className = 'review-card';

    var stars = document.createElement('p');
    stars.className = 'review-card-stars';
    stars.textContent = starString(review.rating);
    card.appendChild(stars);

    var text = document.createElement('p');
    text.className = 'review-card-text';
    text.textContent = '« ' + review.text + ' »';
    card.appendChild(text);

    var author = document.createElement('div');
    author.className = 'review-card-author';

    var name = document.createElement('span');
    name.className = 'review-card-name';
    name.textContent = review.reviewerName;
    author.appendChild(name);

    var date = formatReviewDate(review.date);
    if (date) {
      var dateEl = document.createElement('span');
      dateEl.className = 'review-card-date';
      dateEl.textContent = date;
      author.appendChild(dateEl);
    }

    card.appendChild(author);
    return card;
  }

  var NOTIFICATION_DISMISSED_KEY = 'pf-notification-dismissed';

  function loadNotification() {
    return sanityFetch('*[_id=="siteNotification"][0]{active,message,type,startDate,endDate}')
      .then(function (data) {
        var banner = document.getElementById('site-notification');
        if (!banner) return;
        if (!data || !data.active || !data.message) return;

        var now = new Date();
        if (data.startDate && now < new Date(data.startDate)) return;
        if (data.endDate && now > new Date(data.endDate)) return;

        var dismissed;
        try {
          dismissed = sessionStorage.getItem(NOTIFICATION_DISMISSED_KEY);
        } catch (e) {
          dismissed = null;
        }
        if (dismissed === data.message) return;

        var textEl = document.getElementById('site-notification-text');
        if (textEl) textEl.textContent = data.message;

        banner.className = 'site-notification site-notification--' + (data.type || 'info');
        banner.style.display = 'flex';

        var closeBtn = document.getElementById('site-notification-close');
        if (closeBtn) {
          closeBtn.onclick = function () {
            try {
              sessionStorage.setItem(NOTIFICATION_DISMISSED_KEY, data.message);
            } catch (e) { /* sessionStorage unavailable, just hide for this view */ }
            banner.style.display = 'none';
          };
        }
      })
      .catch(function (err) { console.error('notification:', err); });
  }

  function loadReviews() {
    var settingsQuery = '*[_id=="reviewsSettings"][0]{googleRating,googleReviewCount,googleReviewsUrl}';
    var reviewsQuery = '*[_type=="review" && featured==true] | order(orderRank asc){reviewerName,rating,text,date}';

    return Promise.all([sanityFetch(settingsQuery), sanityFetch(reviewsQuery)])
      .then(function (results) {
        var settings = results[0];
        var reviews = results[1] || [];
        var section = document.getElementById('avis');
        var summaryEl = document.getElementById('reviews-summary');
        var gridEl = document.getElementById('reviews-grid');
        if (!section) return;

        var hasSummary = settings && (typeof settings.googleRating === 'number' || settings.googleReviewsUrl);
        var hasReviews = reviews.length > 0;
        if (!hasSummary && !hasReviews) return;

        if (hasSummary && summaryEl) {
          summaryEl.innerHTML = '';
          if (typeof settings.googleRating === 'number') {
            var starsEl = document.createElement('span');
            starsEl.className = 'reviews-stars';
            starsEl.textContent = starString(settings.googleRating);
            summaryEl.appendChild(starsEl);

            var scoreEl = document.createElement('span');
            scoreEl.className = 'reviews-score';
            scoreEl.textContent = settings.googleRating.toFixed(1).replace('.', ',') + '/5 sur Google';
            summaryEl.appendChild(scoreEl);
          }
          if (typeof settings.googleReviewCount === 'number') {
            var countEl = document.createElement('span');
            countEl.className = 'reviews-count';
            countEl.textContent = '· ' + settings.googleReviewCount + ' avis';
            summaryEl.appendChild(countEl);
          }
          if (settings.googleReviewsUrl) {
            var linkEl = document.createElement('a');
            linkEl.className = 'btn btn-outline btn-small';
            linkEl.href = settings.googleReviewsUrl;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener';
            linkEl.textContent = 'Voir tous nos avis sur Google';
            summaryEl.appendChild(linkEl);
          }
        }

        if (hasReviews && gridEl) {
          gridEl.innerHTML = '';
          reviews.forEach(function (review) {
            gridEl.appendChild(buildReviewCard(review));
          });
        }

        section.style.display = '';
      })
      .catch(function (err) { console.error('reviews:', err); });
  }

  /* ---------- Menu rendering ---------- */
  function buildMenuItem(item) {
    var row = document.createElement('div');
    row.className = 'menu-item';

    if (item.photo && item.photo.url) {
      var photo = document.createElement('img');
      photo.className = 'menu-item-photo';
      photo.src = item.photo.url;
      photo.alt = item.name;
      photo.loading = 'lazy';
      row.appendChild(photo);
    }

    var info = document.createElement('div');
    info.className = 'menu-item-info';

    var name = document.createElement('p');
    name.className = 'menu-item-name';
    name.textContent = item.name;
    info.appendChild(name);

    if (item.description) {
      var desc = document.createElement('p');
      desc.className = 'menu-item-desc';
      desc.textContent = item.description;
      info.appendChild(desc);
    }

    var price = document.createElement('p');
    price.className = 'menu-item-price';
    price.textContent = formatPrice(item.price);

    row.appendChild(info);
    row.appendChild(price);
    return row;
  }

  function buildItemsGrid(items) {
    var grid = document.createElement('div');
    grid.className = 'menu-grid';
    items.forEach(function (item) {
      grid.appendChild(buildMenuItem(item));
    });
    return grid;
  }

  function renderMenu(categories) {
    var tabsEl = document.getElementById('menu-tabs');
    var panelsEl = document.getElementById('menu-panels');
    if (!tabsEl || !panelsEl || !Array.isArray(categories) || !categories.length) return;

    tabsEl.innerHTML = '';
    panelsEl.innerHTML = '';

    categories.forEach(function (category, index) {
      var tabBtn = document.createElement('button');
      tabBtn.className = 'menu-tab' + (index === 0 ? ' active' : '');
      tabBtn.type = 'button';
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('data-target', 'panel-' + category.id);
      tabBtn.textContent = category.name;
      tabsEl.appendChild(tabBtn);

      var panel = document.createElement('div');
      panel.className = 'menu-panel' + (index === 0 ? ' active' : '');
      panel.id = 'panel-' + category.id;
      panel.setAttribute('data-sanity-id', 'menu.category.' + category.id);
      panel.setAttribute('role', 'tabpanel');

      if (category.note) {
        var note = document.createElement('p');
        note.className = 'menu-note';
        note.textContent = category.note;
        panel.appendChild(note);
      }

      if (Array.isArray(category.subcategories) && category.subcategories.length) {
        category.subcategories.forEach(function (sub) {
          var subWrap = document.createElement('div');
          subWrap.className = 'menu-subcategory';

          var heading = document.createElement('h3');
          heading.textContent = sub.name;
          subWrap.appendChild(heading);
          subWrap.appendChild(buildItemsGrid(sub.items || []));

          panel.appendChild(subWrap);
        });
      } else if (Array.isArray(category.items)) {
        panel.appendChild(buildItemsGrid(category.items));
      }

      panelsEl.appendChild(panel);
    });

    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.menu-tab');
      if (!btn) return;

      tabsEl.querySelectorAll('.menu-tab').forEach(function (t) { t.classList.remove('active'); });
      panelsEl.querySelectorAll('.menu-panel').forEach(function (p) { p.classList.remove('active'); });

      btn.classList.add('active');
      var target = document.getElementById(btn.getAttribute('data-target'));
      if (target) target.classList.add('active');
    });
  }

  function renderMenuError() {
    var panelsEl = document.getElementById('menu-panels');
    if (panelsEl) {
      panelsEl.innerHTML = '<p class="menu-note">La carte est momentanément indisponible. Merci de nous contacter au 010/24.81.88.</p>';
    }
  }

  function loadMenu() {
    var itemProjection = 'name, description, price, photo{"url":asset->url}';
    var query =
      '*[_type=="menuCategory"] | order(orderRank asc){' +
      '"id": slug.current, name, note,' +
      'items[]{' + itemProjection + '},' +
      'subcategories[]{name, items[]{' + itemProjection + '}}' +
      '}';
    return sanityFetch(query)
      .then(function (categories) {
        if (!categories || !categories.length) throw new Error('Empty menu result');
        renderMenu(categories);
      })
      .catch(function (err) {
        console.error('menu:', err);
        renderMenuError();
      });
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initHeaderScroll();
    initMobileNav();
    initScrollAnimations();
    initFooterYear();
    initNotificationPosition();
    initNotificationAutoHide();

    loadSiteSettings();
    loadHero();
    loadAbout();
    loadHours();
    loadContact();
    loadNotification();
    loadReviews();
    loadMenu();
  });
})();
